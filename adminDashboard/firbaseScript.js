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

const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Processing...</div>
    `;
document.body.appendChild(loadingOverlay);
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

document.addEventListener('DOMContentLoaded', async function () {

    const form = document.getElementById('courseForm');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const steps = document.querySelectorAll('.step');
    const sections = document.querySelectorAll('.form-section');
    let currentStep = 1;

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    let isEditMode = !!courseId;
    let courseData = null;

    const addReviewBtn = document.getElementById('addReviewBtn');
    const reviewsContainer = document.getElementById('reviews-container');
    const reviewTemplate = document.getElementById('review-template');

    function addNewReview(reviewData = null) {
        const newReview = document.importNode(reviewTemplate.content, true).firstElementChild;

        if (reviewData) {
            newReview.querySelector('.reviewer-name').value = reviewData.name || '';
            newReview.querySelector('.review-message').value = reviewData.message || '';
            newReview.querySelector('.review-date').value = reviewData.date || new Date().toISOString().split('T')[0];
        } else {
            newReview.querySelector('.review-date').value = new Date().toISOString().split('T')[0];
        }

        const removeBtn = newReview.querySelector('.remove-review');
        removeBtn.addEventListener('click', function () {
            newReview.remove();
        });

        reviewsContainer.appendChild(newReview);
    }

    addReviewBtn.addEventListener('click', function () {
        addNewReview();
    });

    function updateUI() {
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            if (stepNum === currentStep) {
                step.classList.add('active');
            } else if (stepNum < currentStep) {
                step.classList.add('completed');
            }
        });

        sections.forEach(section => {
            section.classList.remove('active');
            if (parseInt(section.dataset.step) === currentStep) {
                section.classList.add('active');
            }
        });

        prevBtn.disabled = currentStep === 1;
        const isLastStep = currentStep === sections.length;
        nextBtn.textContent = isLastStep ? (isEditMode ? 'Update' : 'Submit') : 'Next';
    }

    function validateCurrentSection() {
        const currentSection = document.querySelector(`.form-section[data-step="${currentStep}"]`);
        const requiredInputs = currentSection.querySelectorAll('input[required], select[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.reportValidity();
                isValid = false;
            }
        });

        return isValid;
    }

    // Function to fetch course data
    async function fetchCourseData(id) {
        showLoading('Loading course data...');
        try {
            const courseDoc = await getDoc(doc(db, 'courses', id));
            if (courseDoc.exists()) {
                return { id: courseDoc.id, ...courseDoc.data() };
            } else {
                alert('Course not found!');
                window.location.href = './totalCourses.html';
                return null;
            }
        } catch (error) {
            console.error('Error fetching course:', error);
            alert('Error loading course data');
            return null;
        } finally {
            hideLoading();
        }
    }

    // Function to populate form with course data
    function populateForm(courseData) {
        form.querySelector('input[placeholder="Enter course title"]').value = courseData.title || '';
        if (courseData.category) {
            const categorySelect = document.getElementById('courseCategory');
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].text === courseData.category) {
                    categorySelect.selectedIndex = i;
                    break;
                }
            }
        }

        if (courseData.level) {
            const levelSelect = document.getElementById('courseLevel');
            for (let i = 0; i < levelSelect.options.length; i++) {
                if (levelSelect.options[i].text === courseData.level) {
                    levelSelect.selectedIndex = i;
                    break;
                }
            }
        }

        if (courseData.description && tinymce.get('course-description')) {
            tinymce.get('course-description').setContent(courseData.description);
        }

        if (courseData.requirements && tinymce.get('course-requirements')) {
            tinymce.get('course-requirements').setContent(courseData.requirements);
        }
        const prices = form.querySelectorAll('input[type="number"]');
        if (courseData.pricing) {
            prices[0].value = courseData.pricing.singleParticipant || '';
            prices[1].value = courseData.pricing.singleParticipantRecording || '';
            prices[2].value = courseData.pricing.preRecording || '';
            prices[3].value = courseData.pricing.upTo5Participants || '';
            prices[4].value = courseData.pricing.upTo10Participants || '';
        }

        // Handle thumbnail in edit mode
        if (courseData.thumbnail) {
            if (isEditMode) {
                const currentThumbnail = document.getElementById('currentThumbnail');
                if (currentThumbnail) {
                    currentThumbnail.src = courseData.thumbnail;
                }
            } else {
                thumbnailImage.src = courseData.thumbnail;
                thumbnailPreview.style.display = 'block';
            }
        }

        // Populate reviews if they exist
        if (courseData.reviews && Array.isArray(courseData.reviews)) {
            courseData.reviews.forEach(review => {
                addNewReview(review);
            });
        }
    }

    async function handleFormSubmit() {
        showLoading(isEditMode ? 'Updating course...' : 'Creating course...');
        try {
            const courseTitle = form.querySelector('input[placeholder="Enter course title"]').value;
            const category = document.getElementById('courseCategory').value;
            const level = document.getElementById('courseLevel').value;
            const prices = form.querySelectorAll('input[type="number"]');
            const singleParticipant = prices[0].value;
            const singleParticipantRecording = prices[1].value;
            const preRecording = prices[2].value;
            const upTo5Participants = prices[3].value;
            const upTo10Participants = prices[4].value;
            const descriptionEditor = tinymce.get('course-description');
            const description = descriptionEditor ? descriptionEditor.getContent({ format: 'text' }) : '';
            const requirementsEditor = tinymce.get('course-requirements');
            const requirements = requirementsEditor ? requirementsEditor.getContent({ format: 'text' }) : '';

            const reviewItems = reviewsContainer.querySelectorAll('.review-item');
            const reviews = Array.from(reviewItems).map(item => {
                return {
                    name: item.querySelector('.reviewer-name').value,
                    message: item.querySelector('.review-message').value,
                    date: item.querySelector('.review-date').value
                };
            }).filter(review => review.name && review.message);

            // Handle thumbnail upload
            const thumbnailInput = document.getElementById('thumbnailInput');
            let thumbnailURL = isEditMode ? courseData.thumbnail : '';

            if (!isEditMode && thumbnailInput.files.length > 0) {
                try {
                    const file = thumbnailInput.files[0];
                    console.log("File selected:", file.name, file.type, file.size);

                    const storageRef = ref(storage, `course-thumbnails/${Date.now()}-${file.name}`);
                    console.log("Uploading to:", storageRef.fullPath);

                    const snapshot = await uploadBytes(storageRef, file);
                    console.log("Upload successful:", snapshot);

                    thumbnailURL = await getDownloadURL(storageRef);
                    console.log("Download URL obtained:", thumbnailURL);
                } catch (uploadError) {
                    console.error("Upload failed:", uploadError);
                    alert(`File upload failed: ${uploadError.message}`);
                }
            }

            // Create course object
            const updatedCourseData = {
                title: courseTitle,
                description: description,
                category: category,
                level: level,
                thumbnail: thumbnailURL,
                pricing: {
                    singleParticipant: Number(singleParticipant),
                    singleParticipantRecording: Number(singleParticipantRecording),
                    preRecording: Number(preRecording),
                    upTo5Participants: Number(upTo5Participants),
                    upTo10Participants: Number(upTo10Participants)
                },
                requirements: requirements,
                reviews: reviews,
                updatedAt: new Date().toISOString()
            };

            if (!isEditMode) {
                updatedCourseData.createdAt = new Date().toISOString();
                await addDoc(collection(db, 'courses'), updatedCourseData);
                alert('Course created successfully!');
            } else {

                const courseRef = doc(db, 'courses', courseId);
                await updateDoc(courseRef, updatedCourseData);
                alert('Course updated successfully!');
            }


            window.location.href = './totalCourses.html';

        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Error submitting form. Please try again.');
        } finally {
            hideLoading();
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateUI();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (validateCurrentSection()) {
            if (currentStep < sections.length) {
                currentStep++;
                updateUI();
            } else {
                if (currentStep === steps.length) {
                    nextBtn.disabled = true;
                    nextBtn.textContent = isEditMode ? 'Updating...' : 'Submitting...';

                    handleFormSubmit();

                    nextBtn.disabled = false;
                    nextBtn.textContent = isEditMode ? 'Update' : 'Submit';
                }
            }
        }
    });


    steps.forEach(step => {
        step.addEventListener('click', () => {
            const clickedStep = parseInt(step.dataset.step);
            if (clickedStep < currentStep) {
                currentStep = clickedStep;
                updateUI();
            }
        });
    });

    const thumbnailUpload = document.getElementById('thumbnailUpload');
    const thumbnailInput = document.getElementById('thumbnailInput');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    const thumbnailImage = document.getElementById('thumbnailImage');
    const thumbnailUploadContainer = document.getElementById('thumbnailUploadContainer');
    const thumbnailEditDisplay = document.getElementById('thumbnailEditDisplay');

    thumbnailUpload.addEventListener('click', () => {
        thumbnailInput.click();
    });

    thumbnailInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                thumbnailImage.src = e.target.result;
                thumbnailPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    thumbnailUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        thumbnailUpload.style.borderColor = '#0d6efd';
    });

    thumbnailUpload.addEventListener('dragleave', () => {
        thumbnailUpload.style.borderColor = '#ddd';
    });

    thumbnailUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        thumbnailUpload.style.borderColor = '#ddd';

        if (e.dataTransfer.files.length > 0) {
            thumbnailInput.files = e.dataTransfer.files;
            const file = e.dataTransfer.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    thumbnailImage.src = e.target.result;
                    thumbnailPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }
    });

    tinymce.init({
        selector: 'textarea',
        plugins: [

            'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
            'checklist', 'mediaembed', 'casechange', 'export', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'editimage', 'advtemplate', 'ai', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf'
        ],
        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
        tinycomments_mode: 'embedded',
        tinycomments_author: 'Author name',
        mergetags_list: [
            { value: 'First.Name', title: 'First Name' },
            { value: 'Email', title: 'Email' },
        ],
        ai_request: (request, respondWith) => respondWith.string(() => Promise.reject('See docs to implement AI Assistant')),
        setup: function (editor) {
            editor.on('init', function () {
                if (isEditMode && courseData) {
                    if (editor.id === 'course-description' && courseData.description) {
                        editor.setContent(courseData.description);
                    } else if (editor.id === 'course-requirements' && courseData.requirements) {
                        editor.setContent(courseData.requirements);
                    } else if (editor.id === 'course-outcomes' && courseData.learningOutcomes) {
                        editor.setContent(courseData.learningOutcomes);
                    }
                }
            });
        }
    });

    if (isEditMode) {
        document.title = 'Edit Course - Eduport';

        if (thumbnailUploadContainer) {
            thumbnailUploadContainer.style.display = 'none';
        }

        if (thumbnailEditDisplay) {
            thumbnailEditDisplay.style.display = 'block';
        }

        courseData = await fetchCourseData(courseId);
        if (courseData) {
            populateForm(courseData);
        }
    }

    updateUI();
});

let allCourses = [];
let filteredCourses = [];

export async function fetchCourses() {
    showLoading('Loading course data...');
    try {
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        allCourses = coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            hidden: false
        }));
        filteredCourses = [...allCourses];
        return allCourses;
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

        row.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            showCoursePreview(course.id);
        });

        tbody.appendChild(row);
    });
}


async function showCoursePreview(courseId) {
    try {
        let course = allCourses.find(c => c.id === courseId);

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
                
               
                
                <div class="detail-item">
                    <h3>${course.updatedAt ? 'Last Updated' : 'Created'}</h3>
                    <p>${formatDate(course.updatedAt || course.createdAt)}</p>
                </div>
            </div>
            
            ${reviewsHTML}
        `;

        overlay.classList.add('active');
        const closeBtn = overlay.querySelector('.close-btn');
        closeBtn.onclick = () => {
            overlay.classList.remove('active');
        };

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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

const searchInput = document.querySelector('.search-bar input');
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filteredCourses = allCourses.filter(course =>
        course.title.toLowerCase().includes(searchTerm) ||
        course.category.toLowerCase().includes(searchTerm) ||
        course.level.toLowerCase().includes(searchTerm)
    );
    renderCourses('.courses-table', false);
    renderCourses('.adminCourses-table', true);
});

const sortSelect = document.querySelector('.sort-by');
sortSelect.addEventListener('change', (e) => {
    const sortBy = e.target.value;
    switch (sortBy) {
        case 'name':
            filteredCourses.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'date':
            filteredCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'price':
            filteredCourses.sort((a, b) => a.pricing.singleParticipant - b.pricing.singleParticipant);
            break;
    }
    renderCourses('.courses-table', false);
    renderCourses('.adminCourses-table', true);
});

window.deleteCourse = async (courseId) => {
    if (confirm('Are you sure you want to delete this course?')) {
        try {
            await deleteDoc(doc(db, 'courses', courseId));

            allCourses = allCourses.filter(course => course.id !== courseId);
            filteredCourses = filteredCourses.filter(course => course.id !== courseId);
            renderCourses('.courses-table', false);
            renderCourses('.adminCourses-table', true);
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Error deleting course. Please try again.');
        }
    }
};

window.editCourse = (courseId) => {
    window.location.href = `./courseCreateForm.html?id=${courseId}`;
};

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