import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, getDoc, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-storage.js';

const firebaseConfig = {
    apiKey: window.env.apiKey,
    authDomain: window.env.authDomain,
    projectId: window.env.projectId,
    storageBucket: window.env.storageBucket,
    messagingSenderId: window.env.messagingSenderId,
    appId: window.env.appId,
    measurementId: window.env.measurementId
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); 
export {getFirestore, collection, getDocs, addDoc, getDoc, deleteDoc, doc, updateDoc}

const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Processing...</div>
    `;
document.body.appendChild(loadingOverlay);

// Add CSS for loading overlay
const style = document.createElement('style');
style.textContent = `
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        }
        .loading-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        .loading-spinner {
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 5px solid #0d6efd;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        .loading-text {
            color: white;
            margin-top: 15px;
            font-weight: 500;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
document.head.appendChild(style);

// Function to show/hide loading overlay
function showLoading(text = 'Processing...') {
    loadingOverlay.querySelector('.loading-text').textContent = text;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}


// State management
let allCourses = [];
let filteredCourses = [];

// Function to fetch courses from Firebase
export async function fetchCourses() {
    showLoading('Loading course data...');
    try {
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        allCourses = coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            hidden: false // Local state for hiding courses
        }));
        filteredCourses = [...allCourses];
        console.log('Fetched courses:', allCourses);
        return allCourses; // Return success
    } catch (error) {
        console.error('Error fetching courses:', error);
        alert('Error loading courses. Please try again.');
        return false;
    } finally {
        hideLoading();
    }
}
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFA938', '#7AA5D2', '#9B59B6', 
        '#2ECC71', '#3498DB', '#F1C40F', '#E74C3C', '#1ABC9C'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
// Function to render courses to the table with click handlers
function renderCourses(tableSelector = '.courses-table', limitToRecent = false) {
    const tbody = document.querySelector(`${tableSelector} tbody`);
    if (!tbody) return;

    tbody.innerHTML = '';

    let coursesToRender = [...filteredCourses].filter(course => !course.hidden);
    
    if (limitToRecent) {
        coursesToRender.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        coursesToRender = coursesToRender.slice(0, 3);
    }
    
    coursesToRender.forEach(course => {
        const row = document.createElement('tr');
        
        // Make row clickable
        row.classList.add('clickable-row');
        row.setAttribute('data-course-id', course.id);
        
        row.innerHTML = `
            <td>
                <div class="course-info">
                    <div class="course-icon" style="background: ${getRandomColor()}">
                        <i class="fas fa-book"></i>
                    </div>
                    <div>${course.title}</div>
                </div>
            </td>
            <td>
                <div class="instructor">
                    <span>${course.category}</span>
                </div>
            </td>
            <td>${formatDate(course.createdAt)}</td>
            <td><span class="badge badge-${course.level.toLowerCase()}">${course.level}</span></td>
            <td>$${course.pricing.singleParticipant}</td>
            <td><span class="badge badge-pending">live</span></td>
            <td>
                <button class="btn btn-approve" onclick="editCourse('${course.id}')">Edit</button>
                <button class="btn btn-reject" onclick="deleteCourse('${course.id}')">Delete</button>
            </td>
        `;
        
        // Add click event to show course preview
        row.addEventListener('click', (e) => {
            // Prevent triggering if buttons were clicked
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            showCoursePreview(course.id);
        });
        
        tbody.appendChild(row);
    });
}

// Function to show course preview
async function showCoursePreview(courseId) {
    try {
        // Find course in local data first
        let course = allCourses.find(c => c.id === courseId);
        
        // If not found locally, try to fetch from Firestore
        if (!course) {
            const courseDoc = await getDoc(doc(db, 'courses', courseId));
            if (courseDoc.exists()) {
                course = { id: courseDoc.id, ...courseDoc.data() };
            } else {
                throw new Error('Course not found');
            }
        }
        
        const overlay = document.getElementById('coursePreviewOverlay');
        const contentContainer = overlay.querySelector('.preview-content');
        
        // Format reviews if they exist
        let reviewsHTML = '';
        if (course.reviews && course.reviews.length > 0) {
            reviewsHTML = `
                <div class="detail-item reviews-section">
                    <h3>Student Reviews</h3>
                    <div class="reviews-container">
                        ${course.reviews.map(review => `
                            <div class="review-card">
                                <div class="review-header">
                                    <strong>${review.name || 'Anonymous'}</strong>
                                    <span class="review-date">${formatDate(review.date)}</span>
                                </div>
                                <p class="review-message">${review.message}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Create HTML for course preview
        contentContainer.innerHTML = `
            <div class="preview-header">
                <h2>${course.title}</h2>
                <span class="badge badge-${course.level?.toLowerCase()}">${course.level || 'Unspecified'}</span>
            </div>
            
            <div class="preview-image">
                ${course.thumbnail ? 
                  `<img src="${course.thumbnail}" alt="${course.title}">` : 
                  `<div class="placeholder-image" style="background: ${getRandomColor()}">
                     <i class="fas fa-book-open fa-3x"></i>
                   </div>`
                }
            </div>
            
            <div class="preview-details">
                <div class="detail-item">
                    <h3>Category</h3>
                    <p>${course.category || 'Uncategorized'}</p>
                </div>
                
                <div class="detail-item">
                    <h3>Description</h3>
                    <p>${course.description || 'No description available'}</p>
                </div>
                
                <div class="detail-item">
                    <h3>Pricing Options</h3>
                    <div class="pricing-grid">
                        ${course.pricing?.singleParticipant ? 
                          `<div class="pricing-item">
                            <h4>Single Participant</h4>
                            <span class="price">$${course.pricing.singleParticipant}</span>
                           </div>` : ''
                        }
                        
                        ${course.pricing?.singleParticipantRecording ? 
                          `<div class="pricing-item">
                            <h4>Single Participant + Recording</h4>
                            <span class="price">$${course.pricing.singleParticipantRecording}</span>
                           </div>` : ''
                        }
                        
                        ${course.pricing?.preRecording ? 
                          `<div class="pricing-item">
                            <h4>Pre-Recorded</h4>
                            <span class="price">$${course.pricing.preRecording}</span>
                           </div>` : ''
                        }
                        
                        ${course.pricing?.upTo5Participants ? 
                          `<div class="pricing-item">
                            <h4>Up To 5 Participants</h4>
                            <span class="price">$${course.pricing.upTo5Participants}</span>
                           </div>` : ''
                        }
                        
                        ${course.pricing?.upTo10Participants ? 
                          `<div class="pricing-item">
                            <h4>Up To 10 Participants</h4>
                            <span class="price">$${course.pricing.upTo10Participants}</span>
                           </div>` : ''
                        }
                    </div>
                </div>
                
                ${course.requirements ? 
                  `<div class="detail-item">
                    <h3>Requirements</h3>
                    <p>${course.requirements}</p>
                   </div>` : ''
                }
                
                <div class="detail-item">
                    <h3>${course.updatedAt ? 'Last Updated' : 'Created'}</h3>
                    <p>${formatDate(course.updatedAt || course.createdAt)}</p>
                </div>
            </div>
            
            ${reviewsHTML}
        `;
        
        // Show overlay
        overlay.classList.add('active');
        
        // Add event listener to close button
        const closeBtn = overlay.querySelector('.close-btn');
        closeBtn.onclick = () => {
            overlay.classList.remove('active');
        };
        
        // Add event listener to close when clicking outside content
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        };
        
    } catch (error) {
        console.error('Error showing course preview:', error);
        alert('Error loading course details. Please try again.');
    }
}
 
// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Search functionality
// const searchInput = document.querySelector('.search-bar input');
// searchInput.addEventListener('input', (e) => {
//     const searchTerm = e.target.value.toLowerCase();
//     filteredCourses = allCourses.filter(course =>
//         course.title.toLowerCase().includes(searchTerm) ||
//         course.category.toLowerCase().includes(searchTerm) ||
//         course.level.toLowerCase().includes(searchTerm)
//     );
//     renderCourses('.courses-table', false);
//     renderCourses('.adminCourses-table', true);
// });

// Sort functionality
// const sortSelect = document.querySelector('.sort-by');
// sortSelect.addEventListener('change', (e) => {
//     const sortBy = e.target.value;
//     switch (sortBy) {
//         case 'name':
//             filteredCourses.sort((a, b) => a.title.localeCompare(b.title));
//             break;
//         case 'date':
//             filteredCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//             break;
//         case 'price':
//             filteredCourses.sort((a, b) => a.pricing.singleParticipant - b.pricing.singleParticipant);
//             break;
//     }
//     renderCourses('.courses-table', false);
//     renderCourses('.adminCourses-table', true);
// });

// Delete course
window.deleteCourse = async (courseId) => {
    if (confirm('Are you sure you want to delete this course?')) {
        try {
            // Delete the course from Firestore  
            await deleteDoc(doc(db, 'courses', courseId));

            // Update local state  
            allCourses = allCourses.filter(course => course.id !== courseId);
            filteredCourses = filteredCourses.filter(course => course.id !== courseId);

            // Re-render courses  
            renderCourses('.courses-table', false);
            renderCourses('.adminCourses-table', true);
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Error deleting course. Please try again.');
        }
    }
};

// Edit course
window.editCourse = (courseId) => {
    // Redirect to edit page with course ID
    window.location.href = `./courseCreateForm.html?id=${courseId}`;
};

// Toggle course visibility (locally)
window.toggleCourseVisibility = (courseId) => {
    const course = allCourses.find(c => c.id === courseId);
    if (course) {
        course.hidden = !course.hidden;
        const courseInFiltered = filteredCourses.find(c => c.id === courseId);
        if (courseInFiltered) {
            courseInFiltered.hidden = course.hidden;
        }
        renderCourses('.courses-table', false);
        renderCourses('.adminCourses-table', true);
    }
};


document.addEventListener('DOMContentLoaded', () => {
    // Create the overlay if it doesn't exist
    if (!document.getElementById('coursePreviewOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'coursePreviewOverlay';
        overlay.className = 'course-preview-overlay';
        overlay.innerHTML = `
            <div class="preview-container">
                <button class="close-btn">&times;</button>
                <div class="preview-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    fetchCourses().then(() => {
        renderCourses('.courses-table', false);
        renderCourses('.adminCourses-table', true);
    });
});