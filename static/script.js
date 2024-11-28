// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
} // I have no clue how this works


// Cache DOM elements
const searchBar = document.querySelector('.search-bar');
const filterBtns = document.querySelectorAll('.filter-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const contentGrid = document.getElementById('content');
const offlineBanner = document.getElementById('offline-banner');
const itemForm = document.getElementById('itemForm');

// State management
let currentTab = '';
let currentFilter = 'all';
let searchQuery = '';
let cachedData = {
    rules: [],
    combat: [],
    conditions: [],
    homebrew: [],
    all: []
};

// Event Listeners
searchBar.addEventListener('input', handleSearch);
filterBtns.forEach(btn => btn.addEventListener('click', handleFilter));
tabBtns.forEach(btn => btn.addEventListener('click', handleTabChange));

// Handle online/offline status
window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

function handleOnlineStatus(event) {
    offlineBanner.classList.toggle('show', !navigator.onLine);
}

function handleSearch(event) {
    searchQuery = event.target.value.toLowerCase();
    updateDisplay();
}

function handleFilter(event) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentFilter = event.target.dataset.category;
    updateDisplay();
}

function handleTabChange(event) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentTab = event.target.dataset.tab;
    fetchData();
}

async function createItem(category, data) {
    try {
        const response = await fetch(`/api/${category}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: data.title,
                contents: data.contents,
                source: data.source,
                tags: data.tags
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        cachedData[category].push(result);
        updateDisplay();
        return result;
    } catch (error) {
        console.error('Error creating item:', error);
        throw error;
    }
}


itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('itemTitle').value,
        contents: document.getElementById('itemContents').value,
        source: document.getElementById('itemSource').value,
        tags: document.getElementById('itemTags').value.split(',').map(tag => tag.trim())
    };
    
    try {
        await createItem(currentTab, formData);
        itemForm.reset();
        // Optionally hide the form after successful submission
        document.querySelector('.create-form').style.display = 'none';
    } catch (error) {
        console.error('Error submitting form:', error);
    }
});

// Replace your existing toggleCreateForm function with this

function toggleCreateForm() {
    const modal = document.getElementById('createModal');
    modal.classList.toggle('active');

    // Prevent body scrolling when modal is open
    document.body.style.overflow = modal.classList.contains('active') ? 'hidden' : '';
}

// Add click outside to close functionality
document.getElementById('createModal').addEventListener('click', function(e) {
    // Close if clicking the overlay (not the form)
    if (e.target === this) {
        toggleCreateForm();
    }
});

// Add escape key to close
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('createModal').classList.contains('active')) {
        toggleCreateForm();
    }
});

// Update your form submission handler
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        title: document.getElementById('itemTitle').value,
        contents: document.getElementById('itemContents').value,
        source: document.getElementById('itemSource').value,
        tags: document.getElementById('itemTags').value.split(',').map(tag => tag.trim())
    };

    try {
        await createItem(currentTab, formData);
        itemForm.reset();
        toggleCreateForm(); // Close the modal after successful submission
    } catch (error) {
        console.error('Error submitting form:', error);
    }
});

async function fetchData() {
    try {
        const response = await fetch(`/api/${currentTab}`);
        const data = await response.json();
        cachedData[currentTab] = data; // No need to wrap in array anymore
        updateDisplay();
    } catch (error) {
        console.error('Error fetching data:', error);
        // Use cached data if available
        updateDisplay();
    }
}

function updateDisplay() {
    const data = cachedData[currentTab];
    let filteredData = data;

    // Apply category filter
    if (currentFilter !== 'all') {
        filteredData = data.filter(item => item.tags.includes(currentFilter));
    }

    // Apply search
    if (searchQuery) {
        filteredData = filteredData.filter(item => 
            item.title.toLowerCase().includes(searchQuery) ||
            item.contents.toLowerCase().includes(searchQuery)
        );
    }

    // Render content
    contentGrid.innerHTML = filteredData.map(item => `
        <div class="card" data-category="${item.tags.join(' ')}">
            <h3>${item.title}</h3>
            <p>${item.contents}</p>
            <small>${item.source}</small>
        </div>
    `).join('');
}

// Initial load
fetchData();
