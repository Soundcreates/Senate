import React, { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    LayoutDashboard,
    Gavel,
    Globe,
    BrainCircuit,
    BarChart4,
    Lock,
    Database,
    Server,
    Link as LinkIcon
} from 'lucide-react';

// Custom Interface Node
const InterfaceNode = ({ data }) => (
    <div style={{
        padding: '12px 20px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        textAlign: 'center',
        minWidth: '140px',
        position: 'relative'
    }}>
        <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: '#525252' }}>
            {data.icon}
        </div>
        <div style={{ fontWeight: '600', fontSize: '13px', color: '#171717' }}>{data.label}</div>
        <div style={{ fontSize: '10px', color: '#737373', marginTop: '2px' }}>{data.sublabel}</div>
    </div>
);

// Custom Service Node
const ServiceNode = ({ data }) => (
    <div style={{
        padding: '16px 24px',
        borderRadius: '16px',
        background: '#fafafa',
        border: '1px solid #d4d4d4',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        textAlign: 'center',
        minWidth: '180px',
        position: 'relative'
    }}>
        <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
        <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
        <Handle type="source" position={Position.Right} id="right" style={{ background: '#555', top: '50%' }} />
        <Handle type="target" position={Position.Left} id="left" style={{ background: '#555', top: '50%' }} />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#404040' }}>
            {data.icon}
        </div>
        <div style={{ fontWeight: '600', fontSize: '14px', color: '#171717' }}>{data.label}</div>
        <div style={{ fontSize: '11px', color: '#737373', marginTop: '4px' }}>{data.description}</div>
    </div>
);

// Custom Database/Infrastructure Node
const InfraNode = ({ data }) => (
    <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: '#262626',
        color: '#f5f5f5',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        textAlign: 'center',
        minWidth: '140px',
        border: '1px solid #404040',
        position: 'relative'
    }}>
        <Handle type="target" position={Position.Top} style={{ background: '#d4d4d4' }} />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: '#d4d4d4' }}>
            {data.icon}
        </div>
        <div style={{ fontWeight: '500', fontSize: '12px' }}>{data.label}</div>
        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{data.type}</div>
    </div>
);

const staticNodeTypes = {
    interface: InterfaceNode,
    service: ServiceNode,
    infra: InfraNode,
};

const initialNodes = [
    // Layer 1: Interfaces
    { id: 'ui-admin', type: 'interface', position: { x: 0, y: 0 }, data: { label: 'Admin Dashboard', sublabel: 'Project Mgmt', icon: <LayoutDashboard size={20} /> } },
    { id: 'ui-contributor', type: 'interface', position: { x: 250, y: 0 }, data: { label: 'Contributor Dash', sublabel: 'Work & Earnings', icon: <LayoutDashboard size={20} /> } },
    { id: 'ui-arbitrator', type: 'interface', position: { x: 500, y: 0 }, data: { label: 'Arbitrator Portal', sublabel: 'Dispute Resolution', icon: <Gavel size={20} /> } },

    // Layer 2: API Gateway
    {
        id: 'api-gateway',
        type: 'service',
        position: { x: 250, y: 150 },
        style: { width: 300, background: '#f5f5f5', border: '1px dashed #a3a3a3' },
        data: { label: 'API Gateway & Routing', description: 'Next.js / Node.js', icon: <Globe size={24} /> }
    },

    // Layer 3: Core Services
    { id: 'svc-rag', type: 'service', position: { x: 0, y: 320 }, data: { label: 'RAG Matching Engine', description: 'AI Team Assembly', icon: <BrainCircuit size={24} /> } },
    { id: 'svc-oracle', type: 'service', position: { x: 250, y: 320 }, data: { label: 'Productivity Oracle', description: 'Metrics Aggregation', icon: <BarChart4 size={24} /> } },
    { id: 'svc-blockchain', type: 'service', position: { x: 500, y: 320 }, data: { label: 'Escrow Protocol', description: 'Smart Contracts', icon: <Lock size={24} /> } },

    // Layer 4: Infrastructure
    { id: 'db-vector', type: 'infra', position: { x: 0, y: 500 }, data: { label: 'Vector DB', type: 'Chroma', icon: <Database size={18} /> } },
    { id: 'db-sql', type: 'infra', position: { x: 250, y: 500 }, data: { label: 'PostgreSQL', type: 'Supabase', icon: <Server size={18} /> } },
    { id: 'chain-sepolia', type: 'infra', position: { x: 500, y: 500 }, data: { label: 'Ethereum Sepolia', type: 'Testnet', icon: <LinkIcon size={18} /> } },
];

const initialEdges = [
    // Inteface to API
    { id: 'e1', source: 'ui-admin', target: 'api-gateway', animated: true, style: { stroke: '#d4d4d4' } },
    { id: 'e2', source: 'ui-contributor', target: 'api-gateway', animated: true, style: { stroke: '#d4d4d4' } },
    { id: 'e3', source: 'ui-arbitrator', target: 'api-gateway', animated: true, style: { stroke: '#d4d4d4' } },

    // API to Services
    { id: 'e4', source: 'api-gateway', target: 'svc-rag', type: 'smoothstep', style: { stroke: '#d4d4d4' } },
    { id: 'e5', source: 'api-gateway', target: 'svc-oracle', type: 'smoothstep', style: { stroke: '#d4d4d4' } },
    { id: 'e6', source: 'api-gateway', target: 'svc-blockchain', type: 'smoothstep', style: { stroke: '#d4d4d4' } },

    // Services to Infra
    { id: 'e7', source: 'svc-rag', target: 'db-vector', animated: true, style: { stroke: '#737373' } },
    { id: 'e8', source: 'svc-oracle', target: 'db-sql', animated: true, style: { stroke: '#737373' } },
    { id: 'e9', source: 'svc-blockchain', target: 'chain-sepolia', animated: true, style: { stroke: '#171717', strokeWidth: 1.5 } },

    // Cross connections
    { id: 'e10', source: 'svc-oracle', target: 'svc-blockchain', sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', label: 'Signatures', style: { stroke: '#e5e5e5', strokeDasharray: '4,4' }, labelStyle: { fill: '#a3a3a3', fontSize: 10 } },
];

const ArchitectureDiagram = () => {
    const nodeTypes = useMemo(() => staticNodeTypes, []);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    return (
        <div style={{ width: '100%', height: '600px', background: '#fafafa', borderRadius: '24px', border: '1px solid #e5e5e5' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#f5f5f5" gap={24} size={1} />
                <Controls style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '8px', color: '#525252' }} />
            </ReactFlow>
        </div>
    );
};

export default ArchitectureDiagram;
