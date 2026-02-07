import React, { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component for tasks
const TaskNode = ({ data }) => {
    const priorityColors = {
        High: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
        Medium: { bg: '#fff7ed', border: '#ea580c', text: '#9a3412' },
        Low: { bg: '#f0fdf4', border: '#16a34a', text: '#166534' },
    };
    const colors = priorityColors[data.priority] || priorityColors.Medium;

    return (
        <div
            style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'white',
                border: `2px solid ${colors.border}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                minWidth: '200px',
                maxWidth: '280px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: colors.bg,
                        color: colors.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                    }}
                >
                    {data.id}
                </span>
                <span style={{ fontWeight: '600', color: '#2d2a26', fontSize: '14px', flex: 1 }}>
                    {data.title}
                </span>
                <span
                    style={{
                        fontSize: '9px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: colors.bg,
                        color: colors.text,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                    }}
                >
                    {data.priority}
                </span>
            </div>
            <p style={{ fontSize: '11px', color: '#5e503f', margin: '0 0 10px', lineHeight: '1.4' }}>
                {data.description?.substring(0, 80)}
                {data.description?.length > 80 ? '...' : ''}
            </p>
            {data.assignees && data.assignees.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {data.assignees.map((person, idx) => (
                        <span
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                background: '#fbf7ef',
                                fontSize: '10px',
                                color: '#5e503f',
                                border: '1px solid rgba(169,146,125,0.2)',
                            }}
                        >
                            <span>{person.avatar}</span>
                            <span style={{ fontWeight: '500' }}>{person.name?.split(' ')[0]}</span>
                        </span>
                    ))}
                </div>
            )}
            {data.estimatedHours && (
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#a9927d' }}>
                    ⏱ {data.estimatedHours}h estimated
                </div>
            )}
        </div>
    );
};

// Custom node for project start
const StartNode = ({ data }) => (
    <div
        style={{
            padding: '16px 24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #a9927d 0%, #8c7a6b 100%)',
            color: 'white',
            boxShadow: '0 6px 20px rgba(169,146,125,0.4)',
            textAlign: 'center',
            minWidth: '160px',
        }}
    >
        <div style={{ fontSize: '18px', marginBottom: '4px' }}>🚀</div>
        <div style={{ fontWeight: '600', fontSize: '14px' }}>{data.label}</div>
        <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>{data.sublabel}</div>
    </div>
);

// Custom node for project completion
const EndNode = ({ data }) => (
    <div
        style={{
            padding: '16px 24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: 'white',
            boxShadow: '0 6px 20px rgba(34,197,94,0.4)',
            textAlign: 'center',
            minWidth: '160px',
        }}
    >
        <div style={{ fontSize: '18px', marginBottom: '4px' }}>✅</div>
        <div style={{ fontWeight: '600', fontSize: '14px' }}>{data.label}</div>
        <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>{data.sublabel}</div>
    </div>
);

// Custom node for team member
const TeamNode = ({ data }) => (
    <div
        style={{
            padding: '12px 16px',
            borderRadius: '14px',
            background: 'white',
            border: '2px solid #a9927d',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            textAlign: 'center',
            minWidth: '100px',
        }}
    >
        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{data.avatar}</div>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#2d2a26' }}>{data.name}</div>
        <div style={{ fontSize: '10px', color: '#a9927d' }}>{data.role}</div>
        <div
            style={{
                marginTop: '4px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#16a34a',
            }}
        >
            {data.match}% match
        </div>
    </div>
);

const nodeTypes = {
    taskNode: TaskNode,
    startNode: StartNode,
    endNode: EndNode,
    teamNode: TeamNode,
};

const WorkflowDiagram = ({ tasks, taskAssignments, projectTitle, deadline, team }) => {
    const { nodes, edges } = useMemo(() => {
        const generatedNodes = [];
        const generatedEdges = [];

        // Start node
        generatedNodes.push({
            id: 'start',
            type: 'startNode',
            position: { x: 400, y: 0 },
            data: { label: 'Project Start', sublabel: projectTitle || 'New Project' },
        });

        // Calculate layout - tasks in rows
        const tasksPerRow = 3;
        const horizontalSpacing = 320;
        const verticalSpacing = 200;
        const startX = 50;
        const startY = 120;

        // Sort tasks by priority
        const sortedTasks = [...tasks].sort((a, b) => {
            const priorityOrder = { High: 0, Medium: 1, Low: 2 };
            return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        });

        // Add task nodes
        sortedTasks.forEach((task, index) => {
            const row = Math.floor(index / tasksPerRow);
            const col = index % tasksPerRow;
            const x = startX + col * horizontalSpacing;
            const y = startY + row * verticalSpacing;

            generatedNodes.push({
                id: `task-${task.id}`,
                type: 'taskNode',
                position: { x, y },
                data: {
                    ...task,
                    assignees: taskAssignments[task.id] || [],
                },
            });

            // Connect start to first row tasks
            if (row === 0) {
                generatedEdges.push({
                    id: `start-task-${task.id}`,
                    source: 'start',
                    target: `task-${task.id}`,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#a9927d', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#a9927d' },
                });
            }

            // Connect to previous row
            if (row > 0) {
                const prevRowTasks = sortedTasks.slice((row - 1) * tasksPerRow, row * tasksPerRow);
                if (prevRowTasks.length > 0) {
                    const sourceTask = prevRowTasks[Math.min(col, prevRowTasks.length - 1)];
                    generatedEdges.push({
                        id: `task-${sourceTask.id}-task-${task.id}`,
                        source: `task-${sourceTask.id}`,
                        target: `task-${task.id}`,
                        type: 'smoothstep',
                        style: { stroke: '#d4c4b5', strokeWidth: 1.5 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#d4c4b5' },
                    });
                }
            }
        });

        // End node
        const lastRowIndex = Math.floor((sortedTasks.length - 1) / tasksPerRow);
        const endY = startY + (lastRowIndex + 1) * verticalSpacing;

        generatedNodes.push({
            id: 'end',
            type: 'endNode',
            position: { x: 400, y: endY },
            data: { label: 'Project Complete', sublabel: deadline ? `Due: ${deadline}` : 'Delivery' },
        });

        // Connect last row to end
        const lastRowTasks = sortedTasks.slice(lastRowIndex * tasksPerRow);
        lastRowTasks.forEach((task) => {
            generatedEdges.push({
                id: `task-${task.id}-end`,
                source: `task-${task.id}`,
                target: 'end',
                type: 'smoothstep',
                style: { stroke: '#22c55e', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
            });
        });

        // Add team nodes on the right side
        if (team && team.length > 0) {
            const teamStartX = startX + tasksPerRow * horizontalSpacing + 80;
            const teamStartY = startY;

            team.forEach((member, index) => {
                generatedNodes.push({
                    id: `team-${member.id || index}`,
                    type: 'teamNode',
                    position: { x: teamStartX, y: teamStartY + index * 100 },
                    data: member,
                });
            });
        }

        return { nodes: generatedNodes, edges: generatedEdges };
    }, [tasks, taskAssignments, projectTitle, deadline, team]);

    const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

    // Update nodes when props change
    React.useEffect(() => {
        setNodes(nodes);
        setEdges(edges);
    }, [nodes, edges, setNodes, setEdges]);

    if (!tasks || tasks.length === 0) {
        return (
            <div
                style={{
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fbf7ef',
                    borderRadius: '16px',
                    color: '#a9927d',
                }}
            >
                No tasks to visualize
            </div>
        );
    }

    return (
        <div
            style={{
                width: '100%',
                height: '450px',
                background: '#faf9f7',
                borderRadius: '16px',
                border: '1px solid rgba(169,146,125,0.15)',
                overflow: 'hidden',
            }}
        >
            <ReactFlow
                nodes={nodesState}
                edges={edgesState}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={1.5}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#e5e0d8" gap={20} size={1} />
                <Controls
                    style={{
                        background: 'white',
                        border: '1px solid rgba(169,146,125,0.2)',
                        borderRadius: '8px',
                    }}
                />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.type === 'startNode') return '#a9927d';
                        if (node.type === 'endNode') return '#22c55e';
                        if (node.type === 'teamNode') return '#f0eadd';
                        return '#ffffff';
                    }}
                    style={{
                        background: '#fbf7ef',
                        border: '1px solid rgba(169,146,125,0.2)',
                        borderRadius: '8px',
                    }}
                />
            </ReactFlow>
        </div>
    );
};

export default WorkflowDiagram;
