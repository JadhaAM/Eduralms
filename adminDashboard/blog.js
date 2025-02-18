// blog.js
let blogPosts = [];

function initializeBlog() {
    // Sample data
    blogPosts = [
        {
            id: 1,
            title: 'Getting Started with Web Development',
            content: 'Learn the basics of web development...',
            category: 'tutorials',
            date: new Date().toISOString(),
            thumbnail: 'placeholder.jpg'
        }
        // Add more sample posts
    ];
    
    renderBlogPosts();
    setupBlogListeners();
}

function renderBlogPosts(filterCategory = 'all', searchTerm = '') {
    const blogGrid = document.querySelector('.blog-grid');
    blogGrid.innerHTML = '';

    const filteredPosts = blogPosts.filter(post => {
        const categoryMatch = filterCategory === 'all' || post.category === filterCategory;
        const searchMatch = post.title.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
    });

    filteredPosts.forEach(post => {
        const blogCard = document.createElement('div');
        blogCard.className = 'blog-card';
        blogCard.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content.substring(0, 150)}...</p>
            <p>Category: ${post.category}</p>
            <p>Date: ${new Date(post.date).toLocaleDateString()}</p>
            <div class="action-buttons">
                <button onclick="editBlogPost(${post.id})" class="edit-btn">Edit</button>
                <button onclick="deleteBlogPost(${post.id})" class="delete-btn">Delete</button>
            </div>
        `;
        blogGrid.appendChild(blogCard);
    });
}

function setupBlogListeners() {
    document.getElementById('blogSearch').addEventListener('input', (e) => {
        const filterCategory = document.getElementById('blogFilter').value;
        renderBlogPosts(filterCategory, e.target.value);
    });

    document.getElementById('blogFilter').addEventListener('change', (e) => {
        const searchTerm = document.getElementById('blogSearch').value;
        renderBlogPosts(e.target.value, searchTerm);
    });

    document.getElementById('blogForm').addEventListener('submit', handleBlogSubmit);
}

function handleBlogSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const blogData = {
        id: Date.now(),
        title: formData.get('blogTitle'),
        content: formData.get('blogContent'),
        category: formData.get('blogCategory'),
        date: new Date().toISOString()
    };

    blogPosts.push(blogData);
    renderBlogPosts();
    closeBlogModal();
}