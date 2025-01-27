const API_BASE = 'http://localhost:3000/api/v1';

// Tasks API
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks');
    }
}

async function createTask() {
    const titleInput = document.getElementById('taskTitle');
    const title = titleInput.value.trim();
    
    if (!title) return;
    
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        
        if (response.ok) {
            titleInput.value = '';
            loadTasks();
        } else {
            throw new Error('Failed to create task');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        showError('Failed to create task');
    }
}

async function updateTask(id, updates) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        if (response.ok) {
            loadTasks();
        } else {
            throw new Error('Failed to update task');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task');
    }
}

async function deleteTask(id) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTasks();
        } else {
            throw new Error('Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task');
    }
}

function renderTasks(tasks) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = tasks.map(task => `
        <div class="task-item">
            <input type="checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="updateTask('${task.id}', { completed: this.checked })">
            <span style="${task.completed ? 'text-decoration: line-through' : ''}">${task.title}</span>
            <button onclick="deleteTask('${task.id}')">Delete</button>
        </div>
    `).join('');
}

// Pokemon API
async function searchPokemon() {
    const searchInput = document.getElementById('pokemonSearch');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) return;
    
    try {
        const response = await fetch(`${API_BASE}/pokemon/${query}`);
        const pokemon = await response.json();
        renderPokemon(pokemon);
    } catch (error) {
        console.error('Error searching Pokemon:', error);
        showError('Pokemon not found');
    }
}

async function loadPokemonList() {
    try {
        const response = await fetch(`${API_BASE}/pokemon?limit=10`);
        const data = await response.json();
        renderPokemonList(data.results);
    } catch (error) {
        console.error('Error loading Pokemon list:', error);
        showError('Failed to load Pokemon list');
    }
}

function renderPokemon(pokemon) {
    const resultDiv = document.getElementById('pokemonResult');
    resultDiv.innerHTML = `
        <div class="pokemon-card">
            <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
            <div class="pokemon-info">
                <h3>#${pokemon.id} ${pokemon.name}</h3>
                <p>Height: ${pokemon.height/10}m</p>
                <p>Weight: ${pokemon.weight/10}kg</p>
                <div class="pokemon-types">
                    ${pokemon.types.map(t => `
                        <span class="pokemon-type" style="background-color: ${getTypeColor(t.type.name)}">
                            ${t.type.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderPokemonList(pokemonList) {
    const listDiv = document.getElementById('pokemonList');
    listDiv.innerHTML = pokemonList.map(pokemon => `
        <div class="pokemon-list-item">
            <a href="#" onclick="searchPokemonByUrl('${pokemon.url}'); return false;">
                ${pokemon.name}
            </a>
        </div>
    `).join('');
}

async function searchPokemonByUrl(url) {
    try {
        const response = await fetch(url);
        const pokemon = await response.json();
        renderPokemon(pokemon);
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
        showError('Failed to load Pokemon details');
    }
}

function getTypeColor(type) {
    const colors = {
        normal: '#A8A878',
        fire: '#F08030',
        water: '#6890F0',
        electric: '#F8D030',
        grass: '#78C850',
        ice: '#98D8D8',
        fighting: '#C03028',
        poison: '#A040A0',
        ground: '#E0C068',
        flying: '#A890F0',
        psychic: '#F85888',
        bug: '#A8B820',
        rock: '#B8A038',
        ghost: '#705898',
        dragon: '#7038F8',
        dark: '#705848',
        steel: '#B8B8D0',
        fairy: '#EE99AC'
    };
    return colors[type] || '#888888';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadPokemonList();
});