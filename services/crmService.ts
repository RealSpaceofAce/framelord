
import { Contact, ContactZero, Note, Task, Group, Project, TimelineEvent, PipelineStageConfig, Interaction, Pipeline } from '../types';

// --- SEED DATA ---

// CONTACT ZERO (The User)
const USER_ID = 'contact_zero';
const CONTACT_ZERO: Contact = {
    id: USER_ID,
    isSelf: true,
    identity: {
        name: 'Grimson',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grimson&backgroundColor=4433ff',
        socials: {}
    },
    contactInfo: { email: 'grimson@framelord.ai' },
    classification: {
        domain: 'personal',
        type: 'self',
        roleDescription: 'The Frame Lord (Identity Prime)'
    },
    pipeline: {
        stage: 'Ascension',
        status: 'active',
        score: 85,
        trend: 'up',
        lastScanAt: Date.now()
    },
    goals: { topGoal: 'Total Dominance', secondaryGoals: [] },
    notes: [],
    tasks: [
        { id: 't_init_1', text: 'Review quarterly frame audit', isCompleted: false, createdAt: Date.now() },
        { id: 't_init_2', text: 'Update bio protocol', isCompleted: true, createdAt: Date.now() - 10000 }
    ],
    interactions: [],
    history: [
        { id: 'h1', type: 'scan', description: 'Initial Baseline Scan', timestamp: Date.now() - 1000000 },
        { id: 'h2', type: 'stage_change', description: 'Entered Ascension Phase', timestamp: Date.now() - 500000 }
    ],
    aiModels: {
        insights: ['High energy baseline', 'Need to improve vocal tonality', 'Detected 3 weak apologetic patterns'],
        summaries: 'User is progressing well through the beta protocol.',
        forecasts: 'Authority projected to increase by 15% this quarter.',
        plans: 'Daily frame audits required.',
        recommendedActions: []
    }
};

let CONTACTS: Contact[] = [
    CONTACT_ZERO,
    {
        id: 'c1',
        identity: {
            name: 'Sarah Chen',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
            socials: { linkedin: 'linkedin.com/in/sarahchen' }
        },
        contactInfo: { email: 'sarah.c@techcorp.com', phone: '+1 555 0192' },
        classification: {
            domain: 'business',
            type: 'prospect',
            roleDescription: 'VP Engineering. High technical authority. Gatekeeper.'
        },
        pipeline: {
            stage: 'Negotiation',
            status: 'active',
            score: 72,
            trend: 'up',
            lastScanAt: Date.now() - 86400000
        },
        goals: {
            topGoal: 'Close $200k Enterprise Deal',
            secondaryGoals: ['Establish technical dominance']
        },
        notes: [
            { id: 'n1', content: 'Responds well to direct challenges.', timestamp: Date.now() - 100000, dateStr: '2025-12-01', topics: [] }
        ],
        tasks: [
            { id: 't1', text: 'Send technical whitepaper', isCompleted: false, createdAt: Date.now() }
        ],
        interactions: [],
        history: [],
        aiModels: {
            insights: ['She values brevity.', 'Skeptical of sales fluff.'],
            summaries: '',
            forecasts: '',
            plans: '',
            recommendedActions: ['Send Whitepaper']
        }
    }
];

// PIPELINE CONFIG (Visual Blueprint only, state is in Contacts)
const PIPELINE_STAGES: PipelineStageConfig[] = [
    { id: 'Discovery', name: 'Discovery', color: '#60A5FA', order: 1 },
    { id: 'Power Audit', name: 'Power Audit', color: '#A78BFA', order: 2 },
    { id: 'Frame Setting', name: 'Frame Setting', color: '#F472B6', order: 3 },
    { id: 'Negotiation', name: 'Negotiation', color: '#34D399', order: 4 },
    { id: 'Closing', name: 'Closing', color: '#FBBF24', order: 5 }
];

let GROUPS: Group[] = [
    {
        id: 'g1',
        name: 'Alpha Sales Team',
        description: 'Core revenue generators.',
        bannerUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop',
        contactIds: ['c1'],
        frameScore: 80
    }
];

let PROJECTS: Project[] = [
    {
        id: 'p1',
        name: 'Operation Skyfall',
        description: 'Market penetration strategy.',
        status: 'active',
        contactIds: ['c1'], // People involved
        taskIds: [], // Tasks are aggregated from contacts
        bannerUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop',
        layoutOrder: ['notes', 'actions', 'files']
    }
];

// --- HELPERS ---

export const getContactZero = (): ContactZero => {
    const self = CONTACTS.find(c => c.isSelf);
    if (!self) throw new Error('Contact Zero not found in CONTACTS array');
    return self as ContactZero;
};

// CONTACT SPINE: Directory includes EVERYONE, including Self (Contact Zero)
export const getContacts = () => CONTACTS; 
export const getContactById = (id: string) => CONTACTS.find(c => c.id === id);

// --- CORE ACTION: NOTES (Spine Attachment) ---

export const addNote = (dateStr: string, content: string, targetContactId: string = USER_ID) => {
    // 1. Find Target
    const contactIndex = CONTACTS.findIndex(c => c.id === targetContactId);
    if (contactIndex === -1) return;

    const contact = CONTACTS[contactIndex];

    // 2. Parse Syntax (Tasks, Topics, Mentions)
    const tasks: Task[] = [];
    const lines = content.split('\n');
    lines.forEach(line => {
        if (line.trim().startsWith('*')) {
            tasks.push({
                id: `t_${Date.now()}_${Math.random()}`,
                text: line.replace('*', '').trim(),
                isCompleted: false,
                createdAt: Date.now()
            });
        }
    });

    const topics = (content.match(/\[\[(.*?)\]\]/g) || []).map(t => t.slice(2, -2));
    
    // Check for {New Contact} creation syntax
    const newContacts = (content.match(/\{(.*?)\}/g) || []).map(c => c.slice(1, -1));
    newContacts.forEach(name => {
        if (!CONTACTS.find(c => c.identity.name.toLowerCase() === name.toLowerCase())) {
            createContact({ identity: { name, avatarUrl: '', socials: {} } as any });
        }
    });

    // 3. Create Note Object
    const newNote: Note = {
        id: `n_${Date.now()}_${Math.random()}`,
        content,
        timestamp: Date.now(),
        dateStr,
        topics
    };

    // 4. Update Contact (Immutably for React)
    const updatedContact = {
        ...contact,
        notes: [...contact.notes, newNote],
        tasks: [...contact.tasks, ...tasks],
        // If contact is NOT zero, also log interaction
        interactions: !contact.isSelf ? [...contact.interactions, {
            id: `i_${Date.now()}`,
            type: 'note',
            summary: 'Note added',
            timestamp: Date.now()
        } as Interaction] : contact.interactions
    };

    CONTACTS[contactIndex] = updatedContact;
    CONTACTS = [...CONTACTS]; // Trigger update

    // 5. SYNC LOGIC: If adding note to OTHER, also Journal it to Contact Zero (User)
    // This solves "Notes not syncing" to main dashboard
    if (!contact.isSelf) {
        const syncNoteContent = `[[${contact.identity.name}]]: ${content}`;
        const zeroIndex = CONTACTS.findIndex(c => c.isSelf);
        if (zeroIndex !== -1) {
             const zero = CONTACTS[zeroIndex];
             const syncNote: Note = {
                 id: `sys_${Date.now()}_${Math.random()}`,
                 content: syncNoteContent,
                 timestamp: Date.now(),
                 dateStr,
                 topics,
                 isSystem: true
             };
             CONTACTS[zeroIndex] = { ...zero, notes: [...zero.notes, syncNote] };
             CONTACTS = [...CONTACTS];
        }
    }
};

export const appendNoteToEntity = (entityId: string, type: 'Contact' | 'Group' | 'Project', content: string) => {
    const dateStr = new Date().toISOString().split('T')[0];

    if (type === 'Contact') {
        addNote(dateStr, content, entityId);
    } else {
        // For Group/Project, we treat it as a note on Contact Zero about that context
        let contextName = '';
        if (type === 'Group') contextName = GROUPS.find(g => g.id === entityId)?.name || 'Group';
        if (type === 'Project') contextName = PROJECTS.find(p => p.id === entityId)?.name || 'Project';
        
        addNote(dateStr, `[Context: ${contextName}] ${content}`, USER_ID);
    }
};

// --- CORE ACTION: CONTACTS ---

export const createContact = (data: Partial<Contact>) => {
    const newContact: Contact = {
        id: `c_${Date.now()}`,
        identity: {
            name: data.identity?.name || 'Unknown',
            avatarUrl: data.identity?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
            socials: data.identity?.socials || {}
        },
        contactInfo: data.contactInfo || { email: '', phone: '' },
        classification: data.classification || { domain: 'business', type: 'prospect', roleDescription: '' },
        pipeline: {
            stage: 'Discovery',
            status: 'active',
            score: 50,
            trend: 'flat',
            lastScanAt: 0
        },
        goals: { topGoal: '', secondaryGoals: [] },
        notes: [],
        tasks: [],
        interactions: [],
        history: [],
        aiModels: { insights: [], summaries: '', forecasts: '', plans: '', recommendedActions: [] }
    };
    CONTACTS = [...CONTACTS, newContact];
    return newContact;
};

export const updateContact = (id: string, updates: Partial<Contact>) => {
    const idx = CONTACTS.findIndex(c => c.id === id);
    if (idx !== -1) {
        CONTACTS[idx] = { ...CONTACTS[idx], ...updates };
        CONTACTS = [...CONTACTS];
    }
};

// --- DATA ACCESSORS ---

export const getAllNotes = () => {
    // Aggregate notes from ALL contacts for the "All Notes" view
    // Sorted by date
    let all: (Note & { author: string })[] = [];
    CONTACTS.forEach(c => {
        c.notes.forEach(n => {
            all.push({ ...n, author: c.identity.name });
        });
    });
    return all.sort((a,b) => b.timestamp - a.timestamp);
};

export const getNotesByDate = (dateStr: string) => {
    // For Daily View: Show Contact Zero's notes for that day
    const zero = getContactZero();
    return zero.notes.filter(n => n.dateStr === dateStr);
};

export const getSystemActivityNotes = () => {
    const zero = getContactZero();
    return zero.notes.filter(n => n.isSystem);
}

export const getAllTasks = () => {
    // Aggregate tasks from ALL contacts
    let all: (Task & { context: string })[] = [];
    CONTACTS.forEach(c => {
        c.tasks.forEach(t => {
            all.push({ ...t, context: c.identity.name });
        });
    });
    return all.sort((a,b) => b.createdAt - a.createdAt);
};

export const getGraphData = () => {
    const nodes: any[] = [];
    const links: any[] = [];
    const topicMap = new Map<string, boolean>();

    // 1. Nodes for Contacts (Blue)
    CONTACTS.forEach(c => {
        nodes.push({ 
            id: c.id, 
            label: c.identity.name, 
            type: c.isSelf ? 'self' : 'contact', 
            val: c.isSelf ? 20 : (c.pipeline.score / 10),
            color: c.isSelf ? '#ffffff' : '#4433FF' // Contact Blue
        });

        // 1b. Extract Topics from Notes
        c.notes.forEach(n => {
            if (n.topics) {
                n.topics.forEach(t => {
                    if (!topicMap.has(t)) {
                        topicMap.set(t, true);
                        nodes.push({
                            id: `topic_${t}`,
                            label: t,
                            type: 'topic',
                            val: 5,
                            color: '#A855F7' // Purple for Topics
                        });
                    }
                    // Link Contact <-> Topic
                    links.push({ source: c.id, target: `topic_${t}` });
                });
            }
        });
    });

    // 2. Nodes for Groups (Green)
    GROUPS.forEach(g => {
        nodes.push({
            id: g.id,
            label: g.name,
            type: 'group',
            val: (g.frameScore / 10) || 5,
            color: '#4ADE80' // Success Green
        });
        
        // Link Group to Members
        g.contactIds.forEach(cid => {
            links.push({ source: g.id, target: cid });
        });
    });

    // 3. Nodes for Projects (Orange)
    PROJECTS.forEach(p => {
        nodes.push({
            id: p.id,
            label: p.name,
            type: 'project',
            val: 8,
            color: '#FBBF24' // Warning Orange
        });
        
        // Link Project to Contacts
        p.contactIds.forEach(cid => {
            links.push({ source: p.id, target: cid });
        });
    });

    // 4. Default Hub: Link Contact Zero to everyone else if no other link exists
    // This creates the "Map" feel
    const zeroId = USER_ID;
    CONTACTS.forEach(c => {
        if (!c.isSelf) {
            // Check if already linked via group/project
            const existingLink = links.find(l => (l.source === c.id || l.target === c.id));
            if (!existingLink) {
                links.push({ source: zeroId, target: c.id });
            }
        }
    });

    return { nodes, links };
};

// --- CONTAINERS ---

export const getGroups = () => GROUPS;
export const addGroup = (data: Partial<Group>) => {
    const newGroup: Group = {
        id: `g_${Date.now()}`,
        name: data.name || 'New Group',
        description: data.description || '',
        contactIds: [],
        frameScore: 0,
        ...data
    };
    GROUPS = [...GROUPS, newGroup];
};
export const updateGroup = (id: string, updates: Partial<Group>) => {
    GROUPS = GROUPS.map(g => g.id === id ? { ...g, ...updates } : g);
};

export const getProjects = () => PROJECTS;
export const addProject = (data: Partial<Project>) => {
    const newProject: Project = {
        id: `p_${Date.now()}`,
        name: data.name || 'New Project',
        description: data.description || '',
        status: 'active',
        contactIds: [],
        taskIds: [],
        ...data
    };
    PROJECTS = [...PROJECTS, newProject];
};
export const updateProject = (id: string, updates: Partial<Project>) => {
    PROJECTS = PROJECTS.map(p => p.id === id ? { ...p, ...updates } : p);
};

// --- PIPELINES ---
export const getPipelineStages = () => PIPELINE_STAGES;

export const getPipelines = (): Pipeline[] => {
    return [
        { id: 'p1', name: 'Sales Pipeline' },
        { id: 'p2', name: 'Partnership Pipeline' }
    ];
};

// --- AI DUMMY ---
export const processLittleLordCommand = async (contextId: string, type: string, command: string) => {
    // Simply adds a note to the context (which routes to Contact Zero)
    appendNoteToEntity(contextId, type as any, `AI Command: ${command}`);
    return "Executed.";
};

export const addActionToEntity = (id: string, type: string, text: string) => {
    // Find contact and add task
    // If Group/Project, find members? Or add to Zero?
    // "Tasks never exist outside a Contact relationship."
    // Default to Zero for now if generic.
    const contact = CONTACTS.find(c => c.id === id) || getContactZero();
    const newTask: Task = {
        id: `t_${Date.now()}`,
        text: `[${type}] ${text}`,
        isCompleted: false,
        createdAt: Date.now()
    };
    updateContact(contact.id, { tasks: [...contact.tasks, newTask] });
};

export const toggleEntityAction = (id: string, type: string, taskId: string) => {
    // In this model, tasks live on contacts. Need to find where it is.
    // Simplifying: Search all contacts for the task
    for (let c of CONTACTS) {
        if (c.tasks.find(t => t.id === taskId)) {
            const newTasks = c.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
            updateContact(c.id, { tasks: newTasks });
            return;
        }
    }
};

export const addFileToEntity = (id: string, type: string, name: string) => {
    // Just add a note for now since we removed explicit file arrays to conform to Contact spine
    appendNoteToEntity(id, type as any, `File Uploaded: ${name}`);
};
