import { Component, ElementRef, OnInit, inject, input, output, effect } from "@angular/core";
import { Company } from "src/models/company/company.model";
import { Connection } from "src/models/company/connection.model";
import { select, forceSimulation, forceManyBody, forceCenter, forceLink, drag, zoom, zoomIdentity, Simulation } from 'd3';
import { NxGlobal } from "@app/nx/nx.global";

interface NetworkNode {
    id: string;
    name: string;
    group: number;
    net: number;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface NetworkLink {
    source: string | NetworkNode;
    target: string | NetworkNode;
    strength: number;
    projects_count: number;
}

@Component({
    selector: 'network-chart',
    template: '<div class="network-chart" style="height:100%;"></div>',
    styles: [':host { display: block; width: 100%; height: 100%; }'],
    standalone: true
})
export class NetworkChart implements OnInit {
    root = input<Company | undefined>();
    data = input.required<Connection[]>();
    focus = input<string | Company | null>();

    nodeSelected = output<string | null>();

    #nodes: NetworkNode[] = [];
    #links: NetworkLink[] = [];
    #simulation!: Simulation<NetworkNode, NetworkLink>;
    #svg: any;
    #linkSelection: any;
    #nodeSelection: any;
    #chartElement!: HTMLElement;
    #container: any;
    #zoomBehavior: any;
    #isPanning = false;
    #panStart = { x: 0, y: 0 };

    readonly #el = inject(ElementRef);

    constructor() {
        effect(() => {
            // read signals to track them
            this.data();
            this.root();
            this.focus();
            if (this.#simulation) {
                this.updateData();
            }
        });
    }

    ngOnInit() {
        this.#chartElement = this.#el.nativeElement.querySelector('.network-chart')!;
        this.initSvg();
        this.initSimulation();
        this.updateData();
    }

    #getNodeRadius(net: number): number {
        return net === 0 ? 5 : 5 + net;
    }

    #getLinkColor(link: NetworkLink): string {
        const sourceNode = typeof link.source === 'object' ? link.source : this.#nodes.find(n => n.id === link.source);
        const targetNode = typeof link.target === 'object' ? link.target : this.#nodes.find(n => n.id === link.target);
        return (sourceNode && targetNode && (sourceNode.net === 0 || targetNode.net === 0)) ? '#333' : '#999';
    }

    #getLinkWidth(link: NetworkLink): number {
        if (link.projects_count === 0) return 1;
        return Math.min(Math.max(1 + Math.log(link.projects_count), 1), 5);
    }

    #getFocusId(): string | null {
        const focus = this.focus();
        return typeof focus === 'string' ? focus : focus?.id ? String(focus.id) : null;
    }

    initSvg() {
        this.#svg = select(this.#chartElement).append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

        this.#container = this.#svg.append('g');

        this.#zoomBehavior = zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event: any) => {
                this.#container.attr('transform', event.transform);
            });

        this.#svg.call(this.#zoomBehavior);

        this.#svg.on('mousedown', (event: MouseEvent) => {
            if (event.button === 1) {
                event.preventDefault();
                this.#isPanning = true;
                this.#panStart = { x: event.clientX, y: event.clientY };
            }
        });

        this.#svg.on('mousemove', (event: MouseEvent) => {
            if (this.#isPanning) {
                event.preventDefault();
                const dx = event.clientX - this.#panStart.x;
                const dy = event.clientY - this.#panStart.y;
                this.#panStart = { x: event.clientX, y: event.clientY };
                const currentTransform = this.#svg.node().__zoom || zoomIdentity;
                const newTransform = currentTransform.translate(dx / currentTransform.k, dy / currentTransform.k);
                this.#svg.call(this.#zoomBehavior.transform, newTransform);
            }
        });

        this.#svg.on('mouseup', (event: MouseEvent) => {
            if (event.button === 1) this.#isPanning = false;
        });

        this.#svg.on('mouseleave', () => { this.#isPanning = false; });

        this.#container.append('g').attr('class', 'links');
        this.#container.append('g').attr('class', 'nodes');

        const defs = this.#svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'neumorphism-shadow')
            .attr('x', '-50%').attr('y', '-50%')
            .attr('width', '200%').attr('height', '200%');

        filter.append('feDropShadow')
            .attr('dx', -3).attr('dy', -3).attr('stdDeviation', 3)
            .attr('flood-color', '#000').attr('flood-opacity', 0.8);

        filter.append('feDropShadow')
            .attr('dx', 3).attr('dy', 3)
            .attr('flood-color', '#fff').attr('flood-opacity', 0.1);
    }

    initSimulation() {
        this.#simulation = forceSimulation<NetworkNode, NetworkLink>()
            .force('link', forceLink<NetworkNode, NetworkLink>().id((d: NetworkNode) => d.id))
            .force('charge', forceManyBody().strength(-1500))
            .force('center', forceCenter(this.#chartElement.clientWidth / 2, this.#chartElement.clientHeight / 2))
            .on('tick', () => {
                this.#nodeSelection.attr('transform', (d: NetworkNode) => `translate(${d.x},${d.y})`);
                this.#linkSelection
                    .attr('x1', (d: NetworkLink) => (d.source as NetworkNode).x!)
                    .attr('y1', (d: NetworkLink) => (d.source as NetworkNode).y!)
                    .attr('x2', (d: NetworkLink) => (d.target as NetworkNode).x!)
                    .attr('y2', (d: NetworkLink) => (d.target as NetworkNode).y!);
            });
    }

    updateData() {
        const oldNodesById = new Map(this.#nodes.map(n => [n.id, n]));
        const newNodes: NetworkNode[] = [];
        const data = this.data();
        const root = this.root();
        const focusId = this.#getFocusId();
        const normalizeId = (id: unknown): string => String(id);

        if (root) {
            const rootId = normalizeId(root.id);
            let rootNet = 0;
            if (data.length > 0) {
                const firstConn = data[0];
                if (String(firstConn.company1_id) === rootId) rootNet = firstConn.company1?.net || 0;
                else if (String(firstConn.company2_id) === rootId) rootNet = firstConn.company2?.net || 0;
            }
            newNodes.push(oldNodesById.get(rootId) || { id: rootId, name: root.name, group: 0, net: rootNet });

            for (const conn of data) {
                const other = conn.otherCompany(root);
                if (!other) continue;
                const otherId = normalizeId(other.id);
                newNodes.push(oldNodesById.get(otherId) || { id: otherId, name: other.name, group: 1, net: other.net || 0 });
            }
        } else {
            const companyMap = new Map<string, NetworkNode>();
            for (const conn of data) {
                const id1 = normalizeId(conn.company1_id);
                const id2 = normalizeId(conn.company2_id);
                if (!companyMap.has(id1) && conn.company1) {
                    companyMap.set(id1, oldNodesById.get(id1) || { id: id1, name: conn.company1.name, group: 1, net: conn.company1.net || 0 });
                }
                if (!companyMap.has(id2) && conn.company2) {
                    companyMap.set(id2, oldNodesById.get(id2) || { id: id2, name: conn.company2.name, group: 1, net: conn.company2.net || 0 });
                }
            }
            newNodes.push(...companyMap.values());
        }

        const nodeIdSet = new Set(newNodes.map(n => n.id));
        const newLinks: NetworkLink[] = [];
        const meId = NxGlobal.ME_ID ? String(NxGlobal.ME_ID) : null;

        for (const conn of data) {
            if (!conn.company1 || !conn.company2) continue;
            const id1 = normalizeId(conn.company1_id);
            const id2 = normalizeId(conn.company2_id);
            const projectsCount = conn.projects_count || 0;
            let strength = 1 + (projectsCount * 0.5);

            if (meId && (id1 === meId || id2 === meId)) {
                const otherCompany = id1 === meId ? conn.company2 : conn.company1;
                const revenueScore = otherCompany?.net || 0;
                if (revenueScore > 0) strength += revenueScore * 0.05;
            }

            if (nodeIdSet.has(id1) && nodeIdSet.has(id2)) {
                newLinks.push({ source: id1, target: id2, strength, projects_count: projectsCount });
            }
        }

        const centerX = this.#chartElement.clientWidth / 2;
        const centerY = this.#chartElement.clientHeight / 2;

        for (const n of newNodes) {
            const oldNode = oldNodesById.get(n.id);
            if (oldNode) {
                n.x = oldNode.x;
                n.y = oldNode.y;
                n.fx = oldNode.fx;
                n.fy = oldNode.fy;
            }
            if (focusId && n.id === focusId) {
                n.fx = centerX;
                n.fy = centerY;
            }
        }

        this.#nodes = newNodes;
        this.#links = newLinks;

        this.#simulation.nodes(this.#nodes);
        const linkForce = this.#simulation.force('link') as any;
        if (linkForce) {
            linkForce.links(this.#links).strength((d: NetworkLink) => d.strength);
        }

        const linkKey = (d: NetworkLink) => {
            const s = typeof d.source === 'object' ? d.source.id : d.source;
            const t = typeof d.target === 'object' ? d.target.id : d.target;
            return `${s}-${t}`;
        };

        this.#linkSelection = this.#container.select('g.links')
            .selectAll('line')
            .data(this.#links, linkKey);

        this.#linkSelection.exit().remove();

        const linkEnter = this.#linkSelection.enter().append('line')
            .attr('class', 'network-link');

        this.#linkSelection = linkEnter.merge(this.#linkSelection);
        this.#linkSelection
            .attr('stroke', (d: NetworkLink) => this.#getLinkColor(d))
            .attr('stroke-opacity', 1)
            .attr('stroke-width', (d: NetworkLink) => this.#getLinkWidth(d));

        this.#nodeSelection = this.#container.select('g.nodes')
            .selectAll('g')
            .data(this.#nodes, (d: NetworkNode) => d.id);

        this.#nodeSelection.exit().remove();

        const nodeEnter = this.#nodeSelection.enter().append('g')
            .call(
                drag<SVGGElement, NetworkNode>()
                    .on('start', (event: any, d: NetworkNode) => this.#dragstarted(event, d))
                    .on('drag', (event: any, d: NetworkNode) => this.#dragged(event, d))
                    .on('end', (event: any, d: NetworkNode) => this.#dragended(event, d))
            )
            .on('click', (event: any, d: NetworkNode) => this.#togglePin(event, d));

        nodeEnter.append('circle')
            .style('filter', 'url(#neumorphism-shadow)')
            .style('cursor', 'pointer');

        nodeEnter.append('title');
        nodeEnter.append('text')
            .attr('y', 5)
            .attr('fill', 'white')
            .style('font-size', '10px')
            .style('cursor', 'pointer');

        this.#nodeSelection = nodeEnter.merge(this.#nodeSelection);

        this.#nodeSelection.select('circle')
            .attr('r', (n: NetworkNode) => this.#getNodeRadius(n.net))
            .style('fill', (n: NetworkNode) => {
                if (meId && n.id === meId) return '#28a745';
                if (n.net === 0) return '#666';
                return n.group === 0 ? 'var(--color-primary-0)' : 'white';
            })
            .style('stroke', (d: NetworkNode) => {
                if (focusId && d.id === focusId) return 'var(--color-primary-0)';
                return d.fx != null ? 'var(--color-primary-0)' : 'none';
            })
            .style('stroke-width', (d: NetworkNode) => {
                if (focusId && d.id === focusId) return 3;
                return d.fx != null ? 2 : 0;
            });

        this.#nodeSelection.select('title').text((d: NetworkNode) => d.name);

        this.#nodeSelection.select('text')
            .attr('x', (d: NetworkNode) => this.#getNodeRadius(d.net) + 10)
            .style('display', (d: NetworkNode) => d.net === 0 ? 'none' : 'block')
            .text((d: NetworkNode) => d.name);

        this.#simulation.alpha(1).restart();
    }

    #highlightConnectedLinks(nodeId: string) {
        this.#linkSelection
            .attr('stroke', (d: NetworkLink) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                return (sourceId === nodeId || targetId === nodeId) ? 'var(--color-primary-0)' : this.#getLinkColor(d);
            })
            .attr('stroke-width', (d: NetworkLink) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const base = this.#getLinkWidth(d);
                return (sourceId === nodeId || targetId === nodeId) ? base + 1 : base;
            });
    }

    #resetLinkHighlight() {
        this.#linkSelection
            .attr('stroke', (d: NetworkLink) => this.#getLinkColor(d))
            .attr('stroke-width', (d: NetworkLink) => this.#getLinkWidth(d));
    }

    #dragstarted(event: any, d: NetworkNode) {
        if (!event.active) this.#simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        this.#highlightConnectedLinks(d.id);
    }

    #dragged(event: any, d: NetworkNode) {
        d.fx = event.x;
        d.fy = event.y;
    }

    #dragended(event: any, d: NetworkNode) {
        if (!event.active) this.#simulation.alphaTarget(0);
        const focusId = this.#getFocusId();

        if (d.fx != null) {
            this.nodeSelected.emit(d.id);
        } else {
            this.#resetLinkHighlight();
            this.nodeSelected.emit(null);
        }

        this.#nodeSelection.select('circle')
            .style('stroke', (n: NetworkNode) => {
                if (focusId && n.id === focusId) return 'var(--color-primary-0)';
                return n.fx != null ? 'var(--color-primary-0)' : 'none';
            })
            .style('stroke-width', (n: NetworkNode) => {
                if (focusId && n.id === focusId) return 3;
                return n.fx != null ? 2 : 0;
            });
    }

    #togglePin(event: any, d: NetworkNode) {
        event.stopPropagation();

        if (d.fx != null) {
            d.fx = null;
            d.fy = null;
            this.#resetLinkHighlight();
            this.nodeSelected.emit(null);
        } else {
            d.fx = d.x;
            d.fy = d.y;
            this.#highlightConnectedLinks(d.id);
            this.nodeSelected.emit(d.id);
        }

        this.#nodeSelection.select('circle')
            .style('stroke', (n: NetworkNode) => n.fx != null ? 'var(--color-primary-0)' : 'none')
            .style('stroke-width', (n: NetworkNode) => n.fx != null ? 2 : 0);

        this.#simulation.alpha(0.3).restart();
    }
}
