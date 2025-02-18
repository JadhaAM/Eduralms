// courses.js
let courses = [];

function initializeCourses() {
    // Sample data
    courses = [
        {
            id: 1,
            title: 'Web Development Bootcamp',
            description: 'Complete web development course',
            category: 'programming',
            price: 99.99,
            thumbnail: 'placeholder.jpg'
        }
        // Add more sample courses
    ];
    
    renderCourses();
    setupCourseListeners();
}

function renderCourses(filterCategory = 'all', searchTerm = '') {
    const coursesGrid = document.querySelector('.courses-grid');
    coursesGrid.innerHTML = '';

    const filteredCourses = courses.filter(course => {
        const categoryMatch = filterCategory === 'all' || course.category === filterCategory;
        const searchMatch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
    });

    filteredCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <p>Category: ${course.category}</p>
            <p>Price: $${course.price}</p>
            <div class="action-buttons">
                <button onclick="editCourse(${course.id})" class="edit-btn">Edit</button>
                <button onclick="deleteCourse(${course.id})" class="delete-btn">Delete</button>
            </div>
        `;
        coursesGrid.appendChild(courseCard);
    });
}

function setupCourseListeners() {
    document.getElementById('courseSearch').addEventListener('input', (e) => {
        const filterCategory = document.getElementById('courseFilter').value;
        renderCourses(filterCategory, e.target.value);
    });

    document.getElementById('courseFilter').addEventListener('change', (e) => {
        const searchTerm = document.getElementById('courseSearch').value;
        renderCourses(e.target.value, searchTerm);
    });

    document.getElementById('courseForm').addEventListener('submit', handleCourseSubmit);
}

function handleCourseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const courseData = {
        id: Date.now(),
        title: formData.get('courseTitle'),
        description: formData.get('courseDescription'),
        category: formData.get('courseCategory'),
        price: parseFloat(formData.get('coursePrice'))
    };

    courses.push(courseData);
    renderCourses();
    closeCourseModal();
}