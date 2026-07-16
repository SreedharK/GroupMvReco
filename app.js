// ----------------------------------------------------
// MOCK DATASET (MovieLens Subset Simulation)
// ----------------------------------------------------
const movies = [
    { id: 'm1', title: 'The Shawshank Redemption', genre: 'Drama', color: '#1abc9c' },
    { id: 'm2', title: 'The Godfather', genre: 'Crime, Drama', color: '#34495e' },
    { id: 'm3', title: 'The Dark Knight', genre: 'Action, Crime', color: '#2c3e50' },
    { id: 'm4', title: 'Pulp Fiction', genre: 'Crime, Drama', color: '#e74c3c' },
    { id: 'm5', title: 'The Lord of the Rings', genre: 'Adventure, Fantasy', color: '#27ae60' },
    { id: 'm6', title: 'Forrest Gump', genre: 'Drama, Romance', color: '#2980b9' },
    { id: 'm7', title: 'Inception', genre: 'Action, Sci-Fi', color: '#8e44ad' },
    { id: 'm8', title: 'Star Wars', genre: 'Action, Adventure', color: '#f39c12' },
    { id: 'm9', title: 'The Matrix', genre: 'Action, Sci-Fi', color: '#16a085' },
    { id: 'm10', title: 'Goodfellas', genre: 'Biography, Crime', color: '#d35400' },
    { id: 'm11', title: 'Interstellar', genre: 'Adventure, Sci-Fi', color: '#2c3e50' },
    { id: 'm12', title: 'Spirited Away', genre: 'Animation, Adventure', color: '#e67e22' }
];

// ----------------------------------------------------
// STATE
// ----------------------------------------------------
const participants = [
    { id: 'p1', name: 'Person 1', wishTokens: ['w_p1_1', 'w_p1_2', 'w_p1_3'], vetoTokens: ['v_p1_1'], colorClass: 'token-wish-p1' },
    { id: 'p2', name: 'Person 2', wishTokens: ['w_p2_1', 'w_p2_2', 'w_p2_3'], vetoTokens: ['v_p2_1'], colorClass: 'token-wish-p2' },
    { id: 'p3', name: 'Person 3', wishTokens: ['w_p3_1', 'w_p3_2', 'w_p3_3'], vetoTokens: ['v_p3_1'], colorClass: 'token-wish-p3' }
];

// token placements: { tokenId: locationId } (locationId is either 'tray_pX' or 'mX')
let tokenPlacements = {};
let draggedTokenId = null;

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
function init() {
    // 1. Initialize Token Placements to Trays
    participants.forEach(p => {
        p.wishTokens.forEach(t => tokenPlacements[t] = `tray_${p.id}`);
        p.vetoTokens.forEach(t => tokenPlacements[t] = `tray_${p.id}`);
    });

    // 2. Render UI
    renderMovieGrid();
    renderTrays();
    renderTokens();
    
    // 3. Setup Listeners
    document.getElementById('fairnessDial').addEventListener('input', updateConsensus);
    
    // 4. Initial Calculate
    updateConsensus();
}

function renderMovieGrid() {
    const grid = document.getElementById('movieGrid');
    grid.innerHTML = '';
    
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.id = `card_${movie.id}`;
        
        // Gradient background instead of images for premium look
        const bg = document.createElement('div');
        bg.className = 'movie-poster-bg';
        bg.style.background = `linear-gradient(135deg, ${movie.color}, #000)`;
        
        const info = document.createElement('div');
        info.className = 'movie-info';
        info.innerHTML = `
            <div class="movie-title">${movie.title}</div>
            <div class="movie-genre">${movie.genre}</div>
        `;
        
        const dropZone = document.createElement('div');
        dropZone.className = 'token-drop-zone';
        dropZone.id = movie.id; // Location ID
        
        setupDropZone(dropZone);
        
        const vetoed = document.createElement('div');
        vetoed.className = 'vetoed-overlay';
        vetoed.innerText = 'VETOED';
        
        card.appendChild(bg);
        card.appendChild(info);
        card.appendChild(dropZone);
        card.appendChild(vetoed);
        
        grid.appendChild(card);
    });
}

function renderTrays() {
    const container = document.getElementById('traysContainer');
    container.innerHTML = '';
    
    participants.forEach(p => {
        const tray = document.createElement('div');
        tray.className = 'participant-tray';
        
        tray.innerHTML = `
            <div class="tray-header">
                <div class="tray-name">${p.name}</div>
            </div>
            <div class="tray-tokens" id="tray_${p.id}"></div>
        `;
        
        container.appendChild(tray);
        setupDropZone(document.getElementById(`tray_${p.id}`));
    });
}

function renderTokens() {
    // Clear all existing tokens from DOM
    document.querySelectorAll('.token').forEach(el => el.remove());
    
    participants.forEach(p => {
        p.wishTokens.forEach(tId => createTokenElement(tId, '★', p.colorClass, p.id));
        p.vetoTokens.forEach(tId => createTokenElement(tId, 'X', 'token-veto', p.id));
    });
}

function createTokenElement(id, symbol, colorClass, ownerId) {
    const el = document.createElement('div');
    el.className = `token ${colorClass}`;
    el.id = id;
    el.innerText = symbol;
    el.draggable = true;
    el.dataset.owner = ownerId;
    el.dataset.type = symbol === 'X' ? 'veto' : 'wish';
    
    el.addEventListener('dragstart', (e) => {
        draggedTokenId = id;
        setTimeout(() => el.classList.add('dragging'), 0);
    });
    
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        draggedTokenId = null;
    });
    
    const loc = tokenPlacements[id];
    document.getElementById(loc).appendChild(el);
}

// ----------------------------------------------------
// DRAG AND DROP LOGIC
// ----------------------------------------------------
function setupDropZone(zone) {
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });
    
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        
        if (draggedTokenId) {
            tokenPlacements[draggedTokenId] = zone.id;
            zone.appendChild(document.getElementById(draggedTokenId));
            updateConsensus();
        }
    });
}

// ----------------------------------------------------
// NEGOTIATION ENGINE
// ----------------------------------------------------
function updateConsensus() {
    const dialValue = parseFloat(document.getElementById('fairnessDial').value);
    
    // Reset veto states
    document.querySelectorAll('.movie-card').forEach(c => c.classList.remove('is-vetoed'));
    
    const results = movies.map(movie => {
        // Find tokens on this movie
        const tokensOnMovie = Object.keys(tokenPlacements).filter(t => tokenPlacements[t] === movie.id);
        
        let hasVeto = false;
        let totalWishes = 0;
        let uniqueWishers = new Set();
        
        tokensOnMovie.forEach(tId => {
            const tokenEl = document.getElementById(tId);
            if (!tokenEl) return;
            
            if (tokenEl.dataset.type === 'veto') {
                hasVeto = true;
            } else {
                totalWishes += 1;
                uniqueWishers.add(tokenEl.dataset.owner);
            }
        });
        
        if (hasVeto) {
            document.getElementById(`card_${movie.id}`).classList.add('is-vetoed');
            return { movie, score: -1, hasVeto: true, totalWishes, uniqueWisherCount: 0 };
        }
        
        // Calculate Score
        // U = Utilitarian (total wishes)
        // R = Rawlsian (unique wishers * 2 to scale it appropriately against U which maxes at 9)
        const U = totalWishes;
        const R = uniqueWishers.size * 2; 
        
        const score = (1 - dialValue) * U + (dialValue) * R;
        
        return { movie, score, hasVeto: false, totalWishes, uniqueWisherCount: uniqueWishers.size };
    });
    
    // Sort results
    results.sort((a, b) => b.score - a.score);
    
    // Render list
    renderConsensusList(results);
}

function renderConsensusList(results) {
    const list = document.getElementById('consensusList');
    list.innerHTML = '';
    
    let rank = 1;
    
    results.forEach((res) => {
        if (res.hasVeto || res.totalWishes === 0) {
            // Only show films with at least 1 wish, or at least show them greyed out.
            // For the demo, let's only rank films that are not vetoed and have > 0 wishes.
            return;
        }
        
        const item = document.createElement('div');
        item.className = `consensus-item rank-${rank}`;
        
        let reason = '';
        if (res.uniqueWisherCount > 1) {
            reason = `Supported by ${res.uniqueWisherCount} members with ${res.totalWishes} total wishes.`;
        } else {
            reason = `Strong individual preference (${res.totalWishes} wishes from 1 member).`;
        }
        
        item.innerHTML = `
            <div class="rank-badge">${rank}</div>
            <div class="consensus-info">
                <div class="consensus-title">${res.movie.title}</div>
                <div class="consensus-reason">${reason}</div>
            </div>
            <div class="consensus-score">${res.score.toFixed(1)}</div>
        `;
        
        list.appendChild(item);
        rank++;
    });
    
    if (list.innerHTML === '') {
        list.innerHTML = `<div style="text-align:center; color: #8892b0; padding: 2rem 0;">Drop a wish token on a movie to see recommendations.</div>`;
    }
}

// Run!
window.onload = init;
