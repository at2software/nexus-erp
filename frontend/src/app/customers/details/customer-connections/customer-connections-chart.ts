import { Component, Input, OnInit, OnChanges } from "@angular/core";
import { Company } from "@models/company/company.model";
import { Connection } from "@models/company/connection.model";
import { select, forceSimulation, forceManyBody, forceCenter, forceLink, drag, Selection, Simulation, } from 'd3';

@Component({
    selector: 'customer-connections-chart',
    template: '<div id="customer-connections-chart" style="height:100%;"></div>',
    host: { class: 'card' },
    styles: [':host { display: block; width: 100%; height: 100%; }'],
    standalone: true
})
export class CustomersConnectionsChart implements OnInit, OnChanges {
    @Input() root: Company;
    @Input() data: Connection[]

    #nodes: any[] = []
    #links: any[] = []
    #simulation: Simulation<any, undefined>
    #svg: Selection<SVGSVGElement, unknown, HTMLElement, any>
    #linkSelection: Selection<SVGLineElement, any, SVGGElement, any>
    #nodeSelection: Selection<SVGGElement, any, SVGGElement, any>

    ngOnInit() {
        this.initSvg()
        this.initSimulation()
        this.updateData()
    }

    ngOnChanges(changes: any) {
        if ('data' in changes || 'root' in changes) {
            if (this.#simulation) {
                this.updateData()
            }
        }
    }

    initSvg() {
        this.#svg = select('#customer-connections-chart').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')

        // Create groups for links and nodes once
        this.#svg.append('g').attr('class', 'links');
        this.#svg.append('g').attr('class', 'nodes');
        // Append filter defs once in your SVG setup
        const defs = this.#svg.append('defs');

        const filter = defs.append('filter')
            .attr('id', 'neumorphism-shadow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        // Outer shadow (drop shadow)
        filter.append('feDropShadow')
            .attr('dx', -3)
            .attr('dy', -3)
            .attr('stdDeviation', 3)
            .attr('flood-color', '#000')     // dark shadow color
            .attr('flood-opacity', 0.8);

        filter.append('feDropShadow')
            .attr('dx', 3)
            .attr('dy', 3)
            .attr('flood-color', '#fff')     // dark gray inner shadow
            .attr('flood-opacity', 0.1);

    }

    initSimulation() {
        const div = document.getElementById('customer-connections-chart')!;
        this.#simulation = forceSimulation()
            .force('link', forceLink().id((d: any) => d.id))
            .force('charge', forceManyBody().strength(-5000))
            .force('center', forceCenter(div.clientWidth / 2, div.clientHeight / 2))
            .on('tick', () => {
                this.#nodeSelection.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
                this.#linkSelection
                    .attr('x1', (d: any) => (d.source as any).x)
                    .attr('y1', (d: any) => (d.source as any).y)
                    .attr('x2', (d: any) => (d.target as any).x)
                    .attr('y2', (d: any) => (d.target as any).y);
            });
    }

    updateData() {
        const oldNodesById = new Map(this.#nodes.map(n => [n.id, n]));

        const newNodes = [];

        const rootNode = oldNodesById.get(this.root.id) || { id: this.root.id, name: this.root.name, group: 0 };
        newNodes.push(rootNode);

        this.data.forEach(conn => {
            const other = conn.otherCompany(this.root);
            if (!other) return;
            const existingNode = oldNodesById.get(other.id) || { id: other.id, name: other.name, group: 1 };
            newNodes.push(existingNode);
        });

        const newLinks = this.data.map(conn => ({
            source: conn.company1_id === this.root.id ? this.root.id : conn.company1_id,
            target: conn.company2_id === this.root.id ? this.root.id : conn.company2_id
        }));

        newNodes.forEach(n => {
            const oldNode = oldNodesById.get(n.id);
            if (oldNode) {
                n.x = oldNode.x;
                n.y = oldNode.y;
                n.fx = oldNode.fx;
                n.fy = oldNode.fy;
            }
        });

        this.#nodes = newNodes;
        this.#links = newLinks;

        this.#simulation.nodes(this.#nodes);
        (this.#simulation.force('link') as d3.ForceLink<any, any>).links(this.#links);

        this.#linkSelection = this.#svg.select<SVGGElement>('g.links')
            .selectAll<SVGLineElement, any>('line')
            .data(this.#links, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`);

        this.#linkSelection.exit().remove();

        const linkEnter = this.#linkSelection.enter().append('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6);

        this.#linkSelection = linkEnter.merge(this.#linkSelection);

        this.#nodeSelection = this.#svg.select<SVGGElement>('g.nodes')
            .selectAll<SVGGElement, any>('g')
            .data(this.#nodes, (d: any) => d.id);

        this.#nodeSelection.exit().remove();

        const nodeEnter = this.#nodeSelection.enter().append('g')
            .call(
                drag<SVGGElement, any>()
                    .on('start', (event, d) => this.dragstarted(event, d))
                    .on('drag', (event, d) => this.dragged(event, d))
                    .on('end', (event, d) => this.dragended(event, d))
            );

        nodeEnter.append('circle')
            .attr('r', 10)
            .style('fill', (n) => n.group == 0 ? 'var(--color-primary-0)' : '#aaa')
            .style('filter', 'url(#neumorphism-shadow)')
            .style('cursor', 'pointer')

        nodeEnter.append('text')
            .attr('x', 20)
            .attr('y', 5)
            .attr('fill', '#999')
            .style('font-size', '10px')
            .text(d => d.name)

        this.#nodeSelection = nodeEnter.merge(this.#nodeSelection)

        this.#simulation.alpha(1).restart()
    }

    dragstarted(event: any, d: any) {
        if (!event.active) this.#simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event: any, d: any) {
        if (!event.active) this.#simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}
