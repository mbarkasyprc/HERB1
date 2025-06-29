// Herb Tracker Frontend - API Version
// Connects to Cloudflare Workers API backend

const API_BASE = 'https://herb-tracker-api.herbtracker.workers.dev';

// Data storage - now fetched from API
let phytoData = [];
let tcmData = [];
let accessData = [];

// Edit modal state
let currentEditId = null;
let currentEditCategory = null;

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        alert(`Error: ${error.message}`);
        throw error;
    }
}

// Load data from API
async function loadData() {
    try {
        // Load all entries
        const allEntries = await apiRequest('/api/entries');
        
        // Separate by category
        phytoData = allEntries.filter(entry => entry.category === 'phyto');
        tcmData = allEntries.filter(entry => entry.category === 'tcm');
        accessData = allEntries.filter(entry => entry.category === 'access');
        
        // Update display
        updateDisplay();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Function to add entry via API
async function addEntry() {
    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const status = document.getElementById('status').value;
    const method = document.getElementById('method').value;
    const notes = document.getElementById('notes').value;

    if (!name || !date || !amount) {
        alert('Please fill in all required fields');
        return;
    }

    const entry = {
        name,
        date,
        amount: parseFloat(amount),
        category,
        status,
        method,
        notes: notes || ''
    };

    try {
        // Create entry via API
        await apiRequest('/api/entries', {
            method: 'POST',
            body: JSON.stringify(entry)
        });

        // Reload data and update display
        await loadData();
        clearForm();
    } catch (error) {
        console.error('Failed to add entry:', error);
    }
}

// Function to update display
function updateDisplay() {
    // Update phyto table
    const phytoTable = document.getElementById('phytoTable');
    phytoTable.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Method</th>
            <th>Notes</th>
            <th>Actions</th>
        </tr>
        ${phytoData.map(entry => `
            <tr>
                <td>${entry.name}</td>
                <td>${entry.date}</td>
                <td>$${parseFloat(entry.amount).toFixed(2)}</td>
                <td><span class="status-${entry.status}">${entry.status}</span></td>
                <td><span class="method-${entry.method}">${entry.method}</span></td>
                <td>${entry.notes || ''}</td>
                <td>
                    <button onclick="openEditModal('phyto', ${entry.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteEntry('phyto', ${entry.id})" class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('')}
    `;

    // Update TCM table
    const tcmTable = document.getElementById('tcmTable');
    tcmTable.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Method</th>
            <th>Notes</th>
            <th>Actions</th>
        </tr>
        ${tcmData.map(entry => `
            <tr>
                <td>${entry.name}</td>
                <td>${entry.date}</td>
                <td>$${parseFloat(entry.amount).toFixed(2)}</td>
                <td><span class="status-${entry.status}">${entry.status}</span></td>
                <td><span class="method-${entry.method}">${entry.method}</span></td>
                <td>${entry.notes || ''}</td>
                <td>
                    <button onclick="openEditModal('tcm', ${entry.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteEntry('tcm', ${entry.id})" class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('')}
    `;

    // Update Access Fund table
    const accessTable = document.getElementById('accessTable');
    accessTable.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Method</th>
            <th>Notes</th>
            <th>Actions</th>
        </tr>
        ${accessData.map(entry => `
            <tr>
                <td>${entry.name}</td>
                <td>${entry.date}</td>
                <td>$${parseFloat(entry.amount).toFixed(2)}</td>
                <td><span class="status-${entry.status}">${entry.status}</span></td>
                <td><span class="method-${entry.method}">${entry.method}</span></td>
                <td>${entry.notes || ''}</td>
                <td>
                    <button onclick="openEditModal('access', ${entry.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteEntry('access', ${entry.id})" class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('')}
    `;

    // Update statistics
    updateStats();
}

// Function to delete entry via API
async function deleteEntry(category, id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            await apiRequest(`/api/entries/${id}`, {
                method: 'DELETE'
            });

            // Reload data and update display
            await loadData();
        } catch (error) {
            console.error('Failed to delete entry:', error);
        }
    }
}

// Function to clear form
function clearForm() {
    document.getElementById('name').value = '';
    document.getElementById('date').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('category').value = 'phyto';
    document.getElementById('status').value = 'unpaid';
    document.getElementById('method').value = 'pickup';
    document.getElementById('notes').value = '';
}

// Function to update statistics
function updateStats() {
    const totalPhyto = phytoData.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    const totalTCM = tcmData.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    const totalAccess = accessData.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    document.getElementById('totalPhyto').textContent = `$${totalPhyto.toFixed(2)}`;
    document.getElementById('totalTCM').textContent = `$${totalTCM.toFixed(2)}`;
    document.getElementById('totalAccess').textContent = `$${totalAccess.toFixed(2)}`;
}

// Function to switch tabs
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}Content`).classList.add('active');
}

// Edit modal functions
function openEditModal(category, id) {
    const entry = getEntryById(category, id);
    if (entry) {
        currentEditId = id;
        currentEditCategory = category;
        
        document.getElementById('editName').value = entry.name;
        document.getElementById('editDate').value = entry.date;
        document.getElementById('editAmount').value = entry.amount;
        document.getElementById('editCategory').value = entry.category;
        document.getElementById('editStatus').value = entry.status;
        document.getElementById('editMethod').value = entry.method;
        document.getElementById('editNotes').value = entry.notes || '';
        
        document.getElementById('editModal').style.display = 'block';
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditId = null;
    currentEditCategory = null;
}

function getEntryById(category, id) {
    switch(category) {
        case 'phyto':
            return phytoData.find(entry => entry.id === id);
        case 'tcm':
            return tcmData.find(entry => entry.id === id);
        case 'access':
            return accessData.find(entry => entry.id === id);
    }
    return null;
}

async function saveEdit() {
    if (!currentEditId || !currentEditCategory) return;

    const editedEntry = {
        name: document.getElementById('editName').value,
        date: document.getElementById('editDate').value,
        amount: parseFloat(document.getElementById('editAmount').value),
        category: document.getElementById('editCategory').value,
        status: document.getElementById('editStatus').value,
        method: document.getElementById('editMethod').value,
        notes: document.getElementById('editNotes').value || ''
    };

    try {
        // Update entry via API
        await apiRequest(`/api/entries/${currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(editedEntry)
        });

        // Reload data and update display
        await loadData();
        closeEditModal();
    } catch (error) {
        console.error('Failed to update entry:', error);
    }
}

// Initialize display when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Set initial active tab
    switchTab('phyto');
    
    // Load data from API
    await loadData();
}); 