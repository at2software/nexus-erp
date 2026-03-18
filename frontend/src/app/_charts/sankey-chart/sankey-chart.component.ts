import { Component, ElementRef, ViewChild, AfterViewInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from 'src/pipes/money.pipe';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';

export interface SankeyNode {
    id: number;
    name: string;
    color: string;
    is_finished?: boolean;
}

export interface SankeyLink {
    source: number;
    target: number;
    count: number;
    net: number;
}

export interface SankeyData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

@Component({
    selector: 'sankey-chart',
    templateUrl: './sankey-chart.component.html',
    styleUrls: ['./sankey-chart.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class SankeyChartComponent implements AfterViewInit, OnChanges {

    @ViewChild('sankeyContainer') sankeyContainer!: ElementRef<HTMLDivElement>;

    @Input() data?: SankeyData;
    @Input() mode: 'count' | 'money' = 'count';
    @Input() height: number = 200;
    @Input() stateColumns?: Record<number, number>;

    money = new MoneyPipe();

    ngAfterViewInit() {
        if (this.data) {
            this.renderSankey();
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if ((changes['data'] || changes['mode']) && this.sankeyContainer) {
            this.renderSankey();
        }
    }

    renderSankey() {
        if (!this.sankeyContainer || !this.data) return;

        const container = this.sankeyContainer.nativeElement;
        const width = container.clientWidth || 600;
        const height = this.height;

        d3.select(container).selectAll('*').remove();

        if (!this.data.nodes || !this.data.links) {
            console.warn('No funnel data available');
            return;
        }

        const isCountMode = this.mode === 'count';

        // Define fixed column positions for each state (or use provided ones)
        const stateColumns = this.stateColumns || {
            1: 0,  // prepared - left
            6: 1,  // quoted - 2nd
            2: 2,  // started - 3rd
            8: 3,  // beta testing - 4th
            9: 4,  // hyper care - 5th
            3: 5,  // finished - right
            4: 5,  // failed - right
            5: 5,  // ignored - right
            7: 5   // lead failed - right
        };

        const columnCount = 6;
        const marginLeft = 80;
        const marginRight = 80;
        const columnWidth = (width - marginLeft - marginRight) / (columnCount - 1);

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Build nodes with fixed x positions
        const nodesById = new Map();
        this.data.nodes.forEach((node: any) => {
            const column = stateColumns[node.id] ?? 0;
            nodesById.set(node.id, {
                id: node.id,
                name: node.name,
                color: node.color,
                isFinished: node.is_finished,
                column: column,
                x: marginLeft + column * columnWidth
            });
        });

        const nodes = Array.from(nodesById.values());

        // Build links - only forward-facing (source column < target column)
        const links = this.data.links
            .map((link: any) => {
                const sourceNode = nodesById.get(link.source);
                const targetNode = nodesById.get(link.target);
                if (!sourceNode || !targetNode) return null;

                // Only include forward-facing links
                if (sourceNode.column >= targetNode.column) return null;

                return {
                    source: link.source,
                    target: link.target,
                    value: isCountMode ? link.count : link.net
                };
            })
            .filter((link: any) => link !== null);

        if (nodes.length === 0) {
            console.warn('No states found for Sankey diagram');
            return;
        }

        if (links.length === 0) {
            console.warn('No forward-facing state transitions found');
            return;
        }

        const sankeyGenerator = sankey()
            .nodeId((d: any) => d.id)
            .nodeWidth(15)
            .nodePadding(10)
            .nodeAlign(sankeyJustify)
            .extent([[marginLeft, 10], [width - marginRight, height - 10]]);

        const graph: any = sankeyGenerator({
            nodes: nodes.map((d: any) => Object.assign({}, d)),
            links: links.map((d: any) => Object.assign({}, d))
        });

        // Override x positions to use our fixed columns
        graph.nodes.forEach((node: any) => {
            const originalNode = nodesById.get(node.id);
            if (originalNode) {
                node.x0 = originalNode.x;
                node.x1 = originalNode.x + 15;
            }
        });

        svg.append('g')
            .selectAll('rect')
            .data(graph.nodes)
            .join('rect')
            .attr('x', (d: any) => d.x0)
            .attr('y', (d: any) => d.y0)
            .attr('height', (d: any) => d.y1 - d.y0)
            .attr('width', (d: any) => d.x1 - d.x0)
            .attr('fill', (d: any) => d.color || '#666')
            .append('title')
            .text((d: any) => `${d.name}\n${isCountMode ? d.value ?? 0 : this.money.transform(d.value ?? 0)}`);

        const linkGenerator = sankeyLinkHorizontal();

        svg.append('g')
            .attr('fill', 'none')
            .selectAll('path')
            .data(graph.links)
            .join('path')
            .attr('d', (d: any) => linkGenerator(d))
            .attr('stroke', (d: any) => d.source.color || '#666')
            .attr('stroke-width', (d: any) => Math.max(1, d.width))
            .attr('opacity', 0.5)
            .append('title')
            .text((d: any) => `${d.source.name} → ${d.target.name}\n${isCountMode ? d.value : this.money.transform(d.value)}`);

        svg.append('g')
            .style('font', '10px sans-serif')
            .style('fill', '#fff')
            .selectAll('text')
            .data(graph.nodes)
            .join('text')
            .attr('x', (d: any) => d.isFinished ? d.x0 - 6 : d.x1 + 6)
            .attr('y', (d: any) => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', (d: any) => d.isFinished ? 'end' : 'start')
            .text((d: any) => d.name);
    }
}
