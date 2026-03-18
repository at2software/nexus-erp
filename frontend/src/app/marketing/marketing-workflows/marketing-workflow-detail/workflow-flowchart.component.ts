import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, Output, EventEmitter, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { MarketingInitiativeActivity } from '@models/marketing/marketing-initiative-activity.model';
import { NxService } from '@app/nx/nx.service';

// Type for activities that can be displayed in the flowchart
type FlowchartActivity = MarketingActivity | MarketingInitiativeActivity;

interface FlowchartNode {
    id: string;
    activity: FlowchartActivity;
    x: number;
    y: number;
    hasMultipleChildren?: boolean;
    hasNonDirectDependency?: boolean;
}

interface FlowchartLink {
    source: string;
    target: string;
    isDirect: boolean;
    childIndex?: number;
}

@Component({
    selector: 'workflow-flowchart',
    template: `<div #flowchartContainer style="width: 100%; min-height: 600px; position: relative;"></div>`,
    standalone: true,
    imports: [CommonModule]
})
export class WorkflowFlowchartComponent implements OnChanges, AfterViewInit {
    @ViewChild('flowchartContainer') container!: ElementRef<HTMLDivElement>;
    @Input() activities: FlowchartActivity[] = [];
    @Input() parentComponent: any;
    @Output() dependencyAdded = new EventEmitter<{sourceId: string, targetId: string}>();
    @Output() dependencyRemoved = new EventEmitter<{activityId: string}>();
    @Output() activityClicked = new EventEmitter<FlowchartActivity>();

    #nxService = inject(NxService);

    #DAY_HEIGHT = 48;
    #NODE_HEIGHT = 32;
    #NODE_WIDTH = 400;
    #EMPTY_DAY_HEIGHT = 32;
    #CONNECTOR_RADIUS = 4.2;

    #svg: any;
    #nodes: FlowchartNode[] = [];
    #links: FlowchartLink[] = [];
    #dragLine: any;
    #dragSourceId: string | null = null;
    #dragStartPos: {x: number, y: number} | null = null;
    #dragFromBlueDisc = false;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['activities']?.currentValue && this.container) {
            this.renderFlowchart();
        }
    }

    ngAfterViewInit() {
        this.renderFlowchart();
    }

    renderFlowchart() {
        if (!this.container || !this.activities?.length) return;

        const containerElement = this.container.nativeElement;
        const width = containerElement.clientWidth || 800;

        d3.select(containerElement).selectAll('*').remove();

        const { occupiedDays, dayPositions, height } = this.#calculateDayPositions();

        this.#svg = d3.select(containerElement)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        this.#createArrowMarker();
        this.#prepareNodesAndLinks(width, dayPositions);
        this.#drawLinks();
        this.#drawDayLabels(occupiedDays, dayPositions);
        this.#createDragLine();
        this.#drawNodes();
        this.#setupMouseHandlers();
    }

    #calculateDayPositions() {
        const occupiedDays = [...new Set(this.activities.map(a => a.day_offset || 1))].sort((a, b) => a - b);
        const dayPositions = new Map<number, number>();
        let currentY = this.#DAY_HEIGHT;

        for (let i = 0; i < occupiedDays.length; i++) {
            dayPositions.set(occupiedDays[i], currentY);
            currentY += this.#DAY_HEIGHT;

            if (i < occupiedDays.length - 1) {
                const gap = occupiedDays[i + 1] - occupiedDays[i] - 1;
                if (gap > 0) currentY += this.#EMPTY_DAY_HEIGHT;
            }
        }

        return { occupiedDays, dayPositions, height: Math.max(400, currentY + this.#DAY_HEIGHT) };
    }

    #createArrowMarker() {
        this.#svg.append('defs')
            .append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 9)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 10 3, 0 6')
            .attr('fill', '#444');
    }

    #prepareNodesAndLinks(width: number, dayPositions: Map<number, number>) {
        const sortedActivities = [...this.activities].sort((a, b) => (a.day_offset || 0) - (b.day_offset || 0));

        // Group activities by day to calculate horizontal positions
        const activitiesByDay = new Map<number, FlowchartActivity[]>();
        this.activities.forEach(activity => {
            const day = activity.day_offset || 1;
            if (!activitiesByDay.has(day)) {
                activitiesByDay.set(day, []);
            }
            activitiesByDay.get(day)!.push(activity);
        });

        // Calculate x positions for activities on the same day
        const activityXPositions = new Map<string, number>();
        const horizontalPadding = 20; // Padding between activities

        activitiesByDay.forEach((activities, day) => {
            if (activities.length === 1) {
                // Single activity: center it
                activityXPositions.set(activities[0].id, width / 2);
            } else {
                // Multiple activities: distribute them horizontally
                const totalWidth = activities.length * (this.#NODE_WIDTH + horizontalPadding) - horizontalPadding;
                const startX = (width - totalWidth) / 2 + this.#NODE_WIDTH / 2;

                activities.forEach((activity, index) => {
                    const x = startX + index * (this.#NODE_WIDTH + horizontalPadding);
                    activityXPositions.set(activity.id, x);
                });
            }
        });

        this.#nodes = this.activities.map(activity => ({
            id: activity.id,
            activity,
            x: activityXPositions.get(activity.id) || width / 2,
            y: dayPositions.get(activity.day_offset || 1) || this.#DAY_HEIGHT
        }));

        const linksByParent = new Map<string, string[]>();
        this.activities.filter(a => a.parent_activity_id).forEach(a => {
            const children = linksByParent.get(a.parent_activity_id!) || [];
            children.push(a.id);
            linksByParent.set(a.parent_activity_id!, children);
        });

        this.#links = this.activities
            .filter(a => a.parent_activity_id)
            .map(a => {
                const currentIndex = sortedActivities.findIndex(act => act.id === a.id);
                const previousActivity = currentIndex > 0 ? sortedActivities[currentIndex - 1] : null;
                const isDirect = !!(previousActivity && previousActivity.id === a.parent_activity_id);

                return {
                    source: a.parent_activity_id!,
                    target: a.id,
                    isDirect,
                    childIndex: (linksByParent.get(a.parent_activity_id!) || []).indexOf(a.id)
                };
            });

        this.#nodes.forEach(node => {
            node.hasMultipleChildren = (linksByParent.get(node.id) || []).length > 1;

            if (node.activity.parent_activity_id) {
                const currentIndex = sortedActivities.findIndex(a => a.id === node.activity.id);
                const previousActivity = currentIndex > 0 ? sortedActivities[currentIndex - 1] : null;
                node.hasNonDirectDependency = !(previousActivity?.id === node.activity.parent_activity_id);
            }
        });
    }

    #drawLinks() {
        this.#svg.append('g').attr('class', 'links')
            .selectAll('path')
            .data(this.#links)
            .join('path')
            .attr('d', (d: FlowchartLink) => this.#getLinkPath(d))
            .attr('stroke', '#444')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead)');
    }

    #drawDayLabels(occupiedDays: number[], dayPositions: Map<number, number>) {
        const dayLabels = this.#svg.append('g').attr('class', 'day-labels');

        occupiedDays.forEach((day, i) => {
            const y = dayPositions.get(day)!;

            dayLabels.append('text')
                .attr('x', 20)
                .attr('y', y)
                .attr('fill', '#666')
                .attr('font-size', '11px')
                .attr('dominant-baseline', 'middle')
                .text(`Day ${day}`);

            if (i < occupiedDays.length - 1) {
                const gap = occupiedDays[i + 1] - day - 1;
                if (gap > 0) {
                    dayLabels.append('text')
                        .attr('x', 20)
                        .attr('y', y + this.#DAY_HEIGHT + 5)
                        .attr('fill', '#666')
                        .attr('font-size', '16px')
                        .text('⋮');
                }
            }
        });
    }

    #createDragLine() {
        this.#dragLine = this.#svg.append('line')
            .attr('class', 'drag-line')
            .attr('stroke', '#0d6efd')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0);
    }

    #drawNodes() {
        const nodeElements = this.#svg.append('g').attr('class', 'nodes')
            .selectAll('g')
            .data(this.#nodes)
            .join('g')
            .attr('class', 'node')
            .attr('transform', (d: FlowchartNode) => `translate(${d.x - this.#NODE_WIDTH/2}, ${d.y - this.#NODE_HEIGHT/2})`);

        nodeElements.append('rect')
            .attr('width', this.#NODE_WIDTH)
            .attr('height', this.#NODE_HEIGHT)
            .attr('rx', 5)
            .attr('fill', 'var(--bs-card-cap-bg)')
            .attr('stroke', (d: FlowchartNode) => d.activity.has_external_dependency ? '#8b5cf6' : '#555')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('click', (e: MouseEvent, d: FlowchartNode) => this.activityClicked.emit(d.activity))
            .on('contextmenu', (e: MouseEvent, d: FlowchartNode) => this.#onActivityContextMenu(e, d));

        nodeElements.append('text')
            .attr('x', this.#NODE_WIDTH / 2)
            .attr('y', this.#NODE_HEIGHT / 2)
            .attr('text-anchor', 'middle')
            .attr('style', 'pointer-events:none')
            .attr('dominant-baseline', 'middle')
            .attr('fill', (d: FlowchartNode) => d.activity.is_required ? '#fff' : '#999')
            .attr('font-size', '14px')
            .text((d: FlowchartNode) => d.activity.name || '');

        // Quick action icon on the right side
        nodeElements.filter((d: FlowchartNode) => !!d.activity.quick_action)
            .append('text')
            .attr('x', this.#NODE_WIDTH - 12)
            .attr('y', this.#NODE_HEIGHT / 2)
            .attr('text-anchor', 'middle')
            .attr('style', 'pointer-events:none; font-family: "Material Icons"')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#17a2b8')
            .attr('font-size', '16px')
            .text((d: FlowchartNode) => this.#getQuickActionIcon(d.activity.quick_action!));

        this.#createConnector(nodeElements, 'input-connector',
            (d: FlowchartNode) => d.hasNonDirectDependency ? this.#NODE_WIDTH : this.#NODE_WIDTH / 2,
            (d: FlowchartNode) => d.hasNonDirectDependency ? this.#NODE_HEIGHT / 2 : 0,
            (e: MouseEvent, d: FlowchartNode) => this.#startDragFromBlue(e, d),
            (e: MouseEvent, d: FlowchartNode) => this.#onInputConnectorClick(e, d)
        );

        this.#createConnector(nodeElements, 'bottom-connector',
            () => this.#NODE_WIDTH / 2,
            () => this.#NODE_HEIGHT,
            (e: MouseEvent, d: FlowchartNode) => this.#startDragFromGreen(e, d)
        );
    }

    #createConnector(
        nodeElements: any,
        className: string,
        cx: (d: FlowchartNode) => number,
        cy: (d: FlowchartNode) => number,
        onMouseDown: (e: MouseEvent, d: FlowchartNode) => void,
        onClick?: (e: MouseEvent, d: FlowchartNode) => void
    ) {
        const connector = nodeElements.append('circle')
            .attr('class', `connector ${className}`)
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', this.#CONNECTOR_RADIUS)
            .attr('fill', 'var(--bs-card-bg)')
            .attr('stroke', '#666')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mousedown', onMouseDown)
            .on('mouseenter', (e: MouseEvent) => this.#highlightTarget(e))
            .on('mouseleave', (e: MouseEvent) => this.#unhighlightTarget(e))
            .on('mouseup', (e: MouseEvent, d: FlowchartNode) => this.#endDrag(e, d));

        if (onClick) connector.on('click', onClick);
    }

    #setupMouseHandlers() {
        this.#svg.on('mousemove', (e: MouseEvent) => {
            if (!this.#dragSourceId) return;
            const [mouseX, mouseY] = d3.pointer(e, this.#svg.node());
            this.#dragLine.attr('x2', mouseX).attr('y2', mouseY);
        });
        this.#svg.on('mouseup', () => this.#cancelDrag());
    }

    #getLinkPath(link: FlowchartLink): string {
        const source = this.#nodes.find(n => n.id === link.source);
        const target = this.#nodes.find(n => n.id === link.target);
        if (!source || !target) return '';

        const initialDropDown = 8;
        const x1 = source.x;
        const y1 = source.y + this.#NODE_HEIGHT / 2;
        const y1Drop = y1 + initialDropDown;
        const x2 = target.x;
        const y2 = target.y - this.#NODE_HEIGHT / 2;

        if (link.isDirect) {
            const midY = (y1Drop + y2) / 2;
            return `M ${x1} ${y1} L ${x1} ${y1Drop} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        }

        const offset = 30 + (link.childIndex || 0) * 20;
        const rightX = Math.max(x1, x2 + this.#NODE_WIDTH / 2) + offset;
        return `M ${x1} ${y1} L ${x1} ${y1Drop} L ${rightX} ${y1Drop} L ${rightX} ${target.y} L ${x2 + this.#NODE_WIDTH / 2} ${target.y}`;
    }

    #startDragFromBlue(event: MouseEvent, node: FlowchartNode) {
        event.stopPropagation();
        this.#dragSourceId = node.id;
        this.#dragFromBlueDisc = true;
        this.#dragStartPos = { x: event.clientX, y: event.clientY };

        const startX = node.hasNonDirectDependency ? node.x + this.#NODE_WIDTH / 2 : node.x;
        const startY = node.hasNonDirectDependency ? node.y : node.y - this.#NODE_HEIGHT / 2;

        this.#dragLine.attr('x1', startX).attr('y1', startY).attr('opacity', 1);
    }

    #startDragFromGreen(event: MouseEvent, node: FlowchartNode) {
        event.stopPropagation();
        this.#dragSourceId = node.id;
        this.#dragFromBlueDisc = false;
        this.#dragStartPos = { x: event.clientX, y: event.clientY };

        this.#dragLine
            .attr('x1', node.x)
            .attr('y1', node.y + this.#NODE_HEIGHT / 2)
            .attr('opacity', 1);
    }

    #onInputConnectorClick(event: MouseEvent, node: FlowchartNode) {
        event.stopPropagation();

        if (this.#dragStartPos) {
            const dx = Math.abs(event.clientX - this.#dragStartPos.x);
            const dy = Math.abs(event.clientY - this.#dragStartPos.y);
            if (dx > 5 || dy > 5) return;
        }

        if (node.activity.parent_activity_id) {
            this.dependencyRemoved.emit({ activityId: node.activity.id });
        }
    }

    #endDrag(event: MouseEvent, targetNode: FlowchartNode) {
        event.stopPropagation();

        if (!this.#dragSourceId || this.#dragSourceId === targetNode.id) {
            this.#cancelDrag();
            return;
        }

        const targetElement = d3.select(event.target as any);
        const isBlueConnector = targetElement.classed('input-connector');
        const isGreenConnector = targetElement.classed('bottom-connector');

        if ((this.#dragFromBlueDisc && !isGreenConnector) || (!this.#dragFromBlueDisc && !isBlueConnector)) {
            this.#cancelDrag();
            return;
        }

        const sourceNode = this.#nodes.find(n => n.id === this.#dragSourceId);
        if (!sourceNode) {
            this.#cancelDrag();
            return;
        }

        const childNode = this.#dragFromBlueDisc ? sourceNode : targetNode;
        const parentNode = this.#dragFromBlueDisc ? targetNode : sourceNode;

        this.dependencyAdded.emit({ sourceId: parentNode.id, targetId: childNode.id });
        this.#cancelDrag();
    }

    #highlightTarget(event: MouseEvent) {
        if (!this.#dragSourceId) return;

        const targetElement = d3.select(event.target as any);
        const isBlueConnector = targetElement.classed('input-connector');
        const isGreenConnector = targetElement.classed('bottom-connector');

        if ((this.#dragFromBlueDisc && !isGreenConnector) || (!this.#dragFromBlueDisc && !isBlueConnector)) return;

        targetElement
            .attr('r', 6)
            .attr('fill', isBlueConnector ? '#0d6efd' : '#28a745')
            .attr('stroke-width', 3);
    }

    #unhighlightTarget(event: MouseEvent) {
        if (!this.#dragSourceId) return;
        d3.select(event.target as any)
            .attr('r', this.#CONNECTOR_RADIUS)
            .attr('fill', 'var(--bs-card-bg)')
            .attr('stroke-width', 2);
    }

    #cancelDrag() {
        this.#dragSourceId = null;
        this.#dragStartPos = null;
        this.#dragFromBlueDisc = false;
        this.#dragLine.attr('opacity', 0);

        this.#svg.selectAll('.connector')
            .attr('r', this.#CONNECTOR_RADIUS)
            .attr('fill', 'var(--bs-card-bg)')
            .attr('stroke-width', 2);
    }

    #onActivityContextMenu(event: MouseEvent, node: FlowchartNode) {
        event.preventDefault();
        event.stopPropagation();

        (node.activity as any).__nxContext = { component: this.parentComponent };

        const mockNxObject = {
            nx: node.activity,
            tables: this.activities,
            context: 'marketing-activity',
            nxContext: { component: this.parentComponent },
            selected: false,
            el: { nativeElement: this.container.nativeElement },
            get nxAttribute() { return this; },
            get classActive() { return this.selected; },
            setSelected: (selected: boolean) => { mockNxObject.selected = selected; return selected; },
            toggleSelected: () => { mockNxObject.selected = !mockNxObject.selected; return mockNxObject.selected; }
        };

        this.#nxService.onRightClick(mockNxObject as any, event);
    }

    #getQuickActionIcon(qa: string): string {
        const icons: Record<string, string> = { EMAIL: 'email', LINKEDIN: 'open_in_new', LINKEDIN_SEARCH: 'search', CALL: 'phone' };
        return icons[qa] || '';
    }
}
