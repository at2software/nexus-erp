import { ChangeDetectionStrategy, Component, ElementRef, viewChild, effect, untracked, input } from '@angular/core';

import { MoneyPipe } from '@pipes/money.pipe';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'sankey-chart',
    templateUrl: './sankey-chart.component.html',
    styleUrls: ['./sankey-chart.component.scss'],
    standalone: true,
    imports: [],
})
export class SankeyChartComponent {
    sankeyContainer = viewChild<ElementRef<HTMLDivElement>>('sankeyContainer');
    linkTooltip = viewChild<ElementRef<HTMLDivElement>>('linkTooltip');

    data = input<SankeyData | undefined>(undefined);
    mode = input<'count' | 'money'>('count');
    height = input<number>(200);
    stateColumns = input<Record<number, number> | undefined>(undefined);

    money = new MoneyPipe();

    constructor() {
        effect(() => {
            const container = this.sankeyContainer();
            this.data();
            this.mode();
            if (container) untracked(() => this.renderSankey());
        });
    }

    renderSankey() {
        const ref = this.sankeyContainer();
        if (!ref || !this.data) return;

        const container = ref.nativeElement;
        const width = container.clientWidth || 600;
        const h = this.height();

        d3.select(container).selectAll('*').remove();

        const data = this.data();
        if (!data || !data.nodes || !data.links) return;

        const isCountMode = this.mode() === 'count';

        const stateColumns = this.stateColumns() || {
            1: 0, 6: 1, 2: 2, 8: 3, 9: 4, 3: 5, 4: 5, 5: 5, 7: 5,
        };

        const columnCount = 6;
        const marginLeft = 80;
        const marginRight = 80;
        const columnWidth = (width - marginLeft - marginRight) / (columnCount - 1);

        const svg = d3.select(container).append('svg').attr('width', width).attr('height', h);

        const nodesById = new Map();
        data.nodes.forEach((node: any) => {
            const column = stateColumns[node.id] ?? 0;
            nodesById.set(node.id, {
                id: node.id,
                name: node.name,
                color: node.color,
                isFinished: node.is_finished,
                column: column,
                x: marginLeft + column * columnWidth,
            });
        });

        const nodes = Array.from(nodesById.values());

        const links = data.links
            .map((link: any) => {
                const sourceNode = nodesById.get(link.source);
                const targetNode = nodesById.get(link.target);
                if (!sourceNode || !targetNode) return null;
                if (sourceNode.column >= targetNode.column) return null;
                return { source: link.source, target: link.target, value: isCountMode ? link.count : link.net };
            })
            .filter((link: any) => link !== null);

        if (nodes.length === 0 || links.length === 0) return;

        const sankeyGenerator = sankey()
            .nodeId((d: any) => d.id)
            .nodeWidth(15)
            .nodePadding(10)
            .nodeAlign(sankeyJustify)
            .extent([
                [marginLeft, 10],
                [width - marginRight, h - 10],
            ]);

        const graph: any = sankeyGenerator({
            nodes: nodes.map((d: any) => Object.assign({}, d)),
            links: links.map((d: any) => Object.assign({}, d)),
        });

        graph.nodes.forEach((node: any) => {
            const orig = nodesById.get(node.id);
            if (orig) {
                node.x0 = orig.x;
                node.x1 = orig.x + 15;
            }
        });

        const linkGenerator = sankeyLinkHorizontal();
        const tooltipEl = this.linkTooltip()?.nativeElement;

        // Links
        const linkPaths = svg.append('g')
            .attr('fill', 'none')
            .selectAll<SVGPathElement, any>('path')
            .data(graph.links)
            .join('path')
            .attr('class', 'link')
            .attr('d', (d: any) => linkGenerator(d))
            .attr('stroke', (d: any) => d.source.color || '#666')
            .attr('stroke-width', (d: any) => Math.max(1, d.width))
            .attr('opacity', 0.5)
            .style('cursor', 'default')
            .on('mouseover', (event: MouseEvent, d: any) => {
                if (!tooltipEl) return;
                const pct = d.source.value ? Math.round((d.value / d.source.value) * 100) : 0;
                const val = isCountMode ? d.value : this.money.transform(d.value);
                tooltipEl.innerHTML =
                    `<span style="color:${d.source.color}">[${d.source.name}]</span>` +
                    ` ──${pct}%──► ` +
                    `<span style="color:${d.target.color}">[${d.target.name}]</span>` +
                    `<span style="opacity:0.65"> (${val})</span>`;
                tooltipEl.style.display = 'block';
                tooltipEl.style.left = event.clientX + 12 + 'px';
                tooltipEl.style.top = event.clientY - 32 + 'px';
            })
            .on('mousemove', (event: MouseEvent) => {
                if (!tooltipEl) return;
                tooltipEl.style.left = event.clientX + 12 + 'px';
                tooltipEl.style.top = event.clientY - 32 + 'px';
            })
            .on('mouseout', () => {
                if (tooltipEl) tooltipEl.style.display = 'none';
            });

        // Node rects
        const nodeRects = svg.append('g')
            .selectAll<SVGRectElement, any>('rect')
            .data(graph.nodes)
            .join('rect')
            .attr('class', 'node')
            .attr('x', (d: any) => d.x0)
            .attr('y', (d: any) => d.y0)
            .attr('height', (d: any) => d.y1 - d.y0)
            .attr('width', (d: any) => d.x1 - d.x0)
            .attr('fill', (d: any) => d.color || '#666')
            .style('cursor', 'ns-resize');

        nodeRects.append('title')
            .text((d: any) => `${d.name}\n${isCountMode ? (d.value ?? 0) : this.money.transform(d.value ?? 0)}`);

        // Node labels
        const labels = svg.append('g')
            .style('font', '10px sans-serif')
            .style('fill', '#fff')
            .selectAll<SVGTextElement, any>('text')
            .data(graph.nodes)
            .join('text')
            .attr('class', 'node-label')
            .attr('x', (d: any) => (d.isFinished ? d.x0 - 6 : d.x1 + 6))
            .attr('y', (d: any) => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', (d: any) => (d.isFinished ? 'end' : 'start'))
            .text((d: any) => d.name);

        // Y-axis drag on nodes
        const nodeDrag = d3.drag<SVGRectElement, any>().on('drag', (event, d: any) => {
            const nodeHeight = d.y1 - d.y0;
            const newY0 = Math.max(10, Math.min(h - 10 - nodeHeight, d.y0 + event.dy));
            d.y0 = newY0;
            d.y1 = newY0 + nodeHeight;

            nodeRects.filter((n: any) => n === d).attr('y', d.y0);

            sankeyGenerator.update(graph);
            linkPaths.attr('d', (l: any) => linkGenerator(l));
            labels.filter((n: any) => n === d).attr('y', (d.y1 + d.y0) / 2);
        });

        nodeRects.call(nodeDrag);
    }
}
