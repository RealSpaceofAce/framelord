
import React, { useState, useEffect, useRef } from 'react';
import { getNotesByDate, addNote, getGraphData, getAllTasks } from '../../services/crmService';
import { Edit2, FileText, CheckSquare, Map, Search } from 'lucide-react';

// --- GRAPH MAP (Canvas) ---
const GraphMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = getGraphData();
        const nodes = data.nodes.map((n: any) => ({ ...n, x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 0 }));
        
        const animate = () => {
            ctx.fillStyle = '#0E0E0E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Very simple static draw for stability
            nodes.forEach((n: any) => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.val, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.fill();
                ctx.fillStyle = '#888';
                ctx.fillText(n.label, n.x + 10, n.y);
            });
            requestAnimationFrame(animate);
        };
        animate();
    }, []);
    return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full bg-[#0E0E0E]" />;
};

// --- TASKS LIST ---
const TasksList: React.FC = () => {
    const tasks = getAllTasks();
    return (
        <div className="p-8">
            <h2 className="text-xl font-bold text-white mb-4">TASKS</h2>
            {tasks.map(t => (
                <div key={t.id} className="flex gap-2 p-2 border-b border-[#333]">
                    <span className="text-[#4433FF] font-bold">[{t.context}]</span>
                    <span className="text-white">{t.text}</span>
                </div>
            ))}
        </div>
    );
};

// --- DAILY BLOCK ---
const DayBlock: React.FC<{ date: Date }> = ({ date }) => {
    const dateStr = date.toISOString().split('T')[0];
    const notes = getNotesByDate(dateStr);
    
    // Flatten contents for editing
    const [blocks, setBlocks] = useState<string[]>(notes.map(n => n.content));
    if (blocks.length === 0) blocks.push(""); // Init empty

    const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const val = blocks[idx];
            if (val.trim()) addNote(dateStr, val); // Save
            
            const newBlocks = [...blocks];
            newBlocks.splice(idx + 1, 0, "");
            setBlocks(newBlocks);
        }
    };

    const handleChange = (val: string, idx: number) => {
        const newBlocks = [...blocks];
        newBlocks[idx] = val;
        setBlocks(newBlocks);
    };

    return (
        <div className="mb-12">
            <h3 className="text-2xl font-bold text-white mb-4">{date.toLocaleDateString()}</h3>
            <div className="border-l-2 border-[#333] pl-4 space-y-2">
                {blocks.map((b, i) => (
                    <textarea 
                        key={i}
                        value={b}
                        onChange={e => handleChange(e.target.value, i)}
                        onKeyDown={e => handleKeyDown(e, i)}
                        className="w-full bg-transparent text-gray-300 outline-none resize-none h-auto"
                        rows={Math.max(1, b.split('\n').length)}
                        placeholder="Type entry..."
                    />
                ))}
            </div>
        </div>
    );
};

export const NotesView: React.FC = () => {
    const [view, setView] = useState<'DAILY'|'MAP'|'TASKS'>('DAILY');
    
    return (
        <div className="flex h-full bg-[#030412]">
            <div className="w-64 bg-[#0E0E0E] border-r border-[#2A2A2A] p-4 flex flex-col gap-2">
                <button onClick={() => setView('DAILY')} className={`p-2 rounded text-left ${view === 'DAILY' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Daily Notes</button>
                <button onClick={() => setView('TASKS')} className={`p-2 rounded text-left ${view === 'TASKS' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Tasks</button>
                <button onClick={() => setView('MAP')} className={`p-2 rounded text-left ${view === 'MAP' ? 'bg-[#333] text-white' : 'text-gray-500'}`}>Map</button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {view === 'DAILY' && <div className="p-12"><DayBlock date={new Date()} /></div>}
                {view === 'MAP' && <GraphMap />}
                {view === 'TASKS' && <TasksList />}
            </div>
        </div>
    );
};
