// Attach event listeners
document.getElementById('passwordForm').addEventListener('submit', savePassword);
document.getElementById('suggestPassword').addEventListener('click', suggestPassword);
document.getElementById('exportData').addEventListener('click', exportData);
document.getElementById('importFile').addEventListener('change', importData);
// document.getElementById('showPassword').addEventListener('change', togglePasswordVisibilityForm);
document.getElementById('sort-title').addEventListener('click', function () {
  sortPasswords('title');
});
document.getElementById('sort-username').addEventListener('click', function () {
  sortPasswords('username');
});
document.getElementById('toggleFormBtn').addEventListener('click', function () {
  toggleForm();
});

document.addEventListener('DOMContentLoaded', function () {
  displayPasswords(1);

  // Initialize tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Global variables
let editIndex = -1; // Track the index of the entry being edited
let sortDirection = { title: 'asc', username: 'asc' }; // State for sorting direction
const itemsPerPage = 5;
let currentPage = 1;
let totalPages = 1;
let formVisible = false; // Form visibility state

// Function to save password (add or edit)
function savePassword(event) {
  event.preventDefault();
  const title = document.getElementById('title').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const encryptedPassword = btoa(password); // Simple encryption for demonstration

  chrome.storage.local.get({ passwords: [] }, function (result) {
    const passwords = result.passwords;
    if (editIndex >= 0) {
      // Update existing entry
      passwords[editIndex] = { title, username, password: encryptedPassword };
      editIndex = -1; // Reset edit index
    } else {
      // Add a new entry
      passwords.push({ title, username, password: encryptedPassword });
    }
    chrome.storage.local.set({ passwords }, function () {
      displayPasswords(1);
      document.getElementById('passwordForm').reset(); // Reset form
      if (formVisible) {
        toggleForm(); // Hide form if visible
      }
    });
  });
}

// Suggest a random password
function suggestPassword() {
  const length = 12; // Set desired password length
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";

  let password = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }

  document.getElementById('password').value = password;
}

// Function to toggle form visibility
function toggleForm() {
  const form = document.getElementById('passwordForm');
  const toggleButton = document.getElementById('toggleFormBtn');

  // Toggle form visibility using Bootstrap's `d-none` class
  if (formVisible) {
    form.classList.add('d-none');
    toggleButton.innerHTML = '<i class="fas fa-plus"></i>'; // Change to plus icon when form is hidden
  } else {
    form.classList.remove('d-none');
    toggleButton.innerHTML = '<i class="fas fa-minus"></i>'; // Change to minus icon when form is visible
  }

  formVisible = !formVisible; // Update visibility state
}

// Toggle password visibility in the form
// function togglePasswordVisibilityForm() {
//   const passwordInput = document.getElementById('password');
//   const showPasswordCheckbox = document.getElementById('showPassword');
//   if (showPasswordCheckbox.checked) {
//     passwordInput.type = 'text';
//   } else {
//     passwordInput.type = 'password';
//   }
// }

// Function to sort passwords based on a field
function sortPasswords(field) {
  chrome.storage.local.get({ passwords: [] }, function (result) {
    const passwords = result.passwords;

    // Toggle sorting direction
    sortDirection[field] = sortDirection[field] === 'asc' ? 'desc' : 'asc';

    passwords.sort((a, b) => {
      let valueA = a[field].toLowerCase();
      let valueB = b[field].toLowerCase();

      if (sortDirection[field] === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });

    chrome.storage.local.set({ passwords }, function () {
      displayPasswords(1);
    });

    // Update sort icons
    const sortIconTitle = document.getElementById('title-sort-indicator');
    const sortIconUsername = document.getElementById('username-sort-indicator');

    if (field === 'title') {
      sortIconTitle.className = sortDirection.title === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
      sortIconUsername.className = 'fas fa-sort'; // Reset the other icon
    } else if (field === 'username') {
      sortIconUsername.className = sortDirection.username === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
      sortIconTitle.className = 'fas fa-sort'; // Reset the other icon
    }
  });
}

// Display paginated passwords
function displayPasswords(page = 1) {
  chrome.storage.local.get({ passwords: [] }, function (result) {
    const passwords = result.passwords;

    totalPages = Math.ceil(passwords.length / itemsPerPage); // Calculate total pages
    currentPage = page; // Update current page

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedPasswords = passwords.slice(start, end);

    const tbody = document.getElementById('passwordTable').querySelector('tbody');
    tbody.innerHTML = '';
    paginatedPasswords.forEach((data, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.title}</td>
        <td>${data.username}</td>
        <td>
          <input type="password" value="${atob(data.password)}" readonly class="form-control">
        </td>
        <td>
          <div class="d-flex justify-content-between">
            <button class="toggle-visibility btn btn-secondary" data-bs-toggle="tooltip" title="Show/Hide Password">
              <i class="fas fa-eye"></i>
            </button>
            <button class="edit btn btn-info" data-index="${start + index}" data-bs-toggle="tooltip" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete btn btn-danger" data-index="${start + index}" data-bs-toggle="tooltip" title="Delete">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Attach event listeners for toggle, edit, and delete buttons
    attachRowEventListeners();

    // Update pagination
    updatePagination();
  });
}

// Update pagination controls
function updatePagination() {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  if (totalPages <= 1) return; // No need to display pagination for a single page

  const maxVisiblePages = 5; // Number of pages to display at once (excluding first and last)

  const createPageItem = (pageNumber, isActive = false) => {
    const li = document.createElement('li');
    li.classList.add('page-item');
    if (isActive) li.classList.add('active');
    li.innerHTML = `<a class="page-link" href="#">${pageNumber}</a>`;
    li.addEventListener('click', function (e) {
      e.preventDefault();
      displayPasswords(pageNumber);
    });
    return li;
  };

  // Add the first page
  pagination.appendChild(createPageItem(1, currentPage === 1));

  // Determine the range of pages to show around the current page
  let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxVisiblePages / 2));

  // Adjust the range if we are near the beginning or end
  if (currentPage <= Math.floor(maxVisiblePages / 2)) {
    endPage = Math.min(totalPages - 1, maxVisiblePages);
  }
  if (currentPage > totalPages - Math.floor(maxVisiblePages / 2)) {
    startPage = Math.max(2, totalPages - maxVisiblePages + 1);
  }

  // Add ellipsis if there are hidden pages before the visible range
  if (startPage > 2) {
    const li = document.createElement('li');
    li.classList.add('page-item', 'disabled');
    li.innerHTML = '<a class="page-link" href="#">...</a>';
    pagination.appendChild(li);
  }

  // Add visible page numbers
  for (let i = startPage; i <= endPage; i++) {
    pagination.appendChild(createPageItem(i, currentPage === i));
  }

  // Add ellipsis if there are hidden pages after the visible range
  if (endPage < totalPages - 1) {
    const li = document.createElement('li');
    li.classList.add('page-item', 'disabled');
    li.innerHTML = '<a class="page-link" href="#">...</a>';
    pagination.appendChild(li);
  }

  // Add the last page
  if (totalPages > 1) {
    pagination.appendChild(createPageItem(totalPages, currentPage === totalPages));
  }
}

// Attach events for toggle, edit, and delete buttons in the table
function attachRowEventListeners() {
  document.querySelectorAll('.toggle-visibility').forEach(button => {
    button.addEventListener('click', function () {
      togglePasswordVisibility(this);
    });
  });

  document.querySelectorAll('.edit').forEach(button => {
    button.addEventListener('click', function () {
      editPassword(this.getAttribute('data-index'));
    });
  });

  document.querySelectorAll('.delete').forEach(button => {
    button.addEventListener('click', function () {
      deletePassword(this.getAttribute('data-index'));
    });
  });
}

// Toggle visibility of password in table
function togglePasswordVisibility(button) {
  const input = button.closest('tr').querySelector('input[type="password"], input[type="text"]');
  const icon = button.querySelector('i'); // Get the icon element

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye'); // Remove "eye" icon
    icon.classList.add('fa-eye-slash'); // Add "eye-slash" icon
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash'); // Remove "eye-slash" icon
    icon.classList.add('fa-eye'); // Add "eye" icon
  }
}

// Edit a password entry
function editPassword(index) {
  chrome.storage.local.get({ passwords: [] }, function (result) {
    const passwords = result.passwords;
    const data = passwords[index];
    document.getElementById('title').value = data.title;
    document.getElementById('username').value = data.username;
    document.getElementById('password').value = atob(data.password);
    editIndex = index; // Set global edit index
    if (!formVisible) {
      toggleForm(); // Show form if it's not already visible
    }
  });
}

// Delete a password entry
function deletePassword(index) {
  chrome.storage.local.get({ passwords: [] }, function (result) {
    const passwords = result.passwords;
    passwords.splice(index, 1);
    chrome.storage.local.set({ passwords }, function () {
      // Adjust page if deletion affects current page
      if (passwords.length % itemsPerPage === 0 && currentPage > 1) {
        currentPage--;
      }
      displayPasswords(currentPage);
    });
  });
}

// Export password data to a text file
function exportData() {
  chrome.storage.local.get({ passwords: [] }, function (result) {
    const passwords = result.passwords;
    const dataStr = passwords.map(data => `Title: ${data.title}, Username: ${data.username}, Password: ${atob(data.password)}`).join('\n');
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passwords.txt';
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Import password data from a text file
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const contents = e.target.result;
    const importedPasswords = contents.split('\n').map(line => {
      const [title, username, password] = line.split(', ').map(item => item.split(': ')[1]);
      return { title, username, password: btoa(password) }; // Encode password for storage
    });

    chrome.storage.local.get({ passwords: [] }, function (result) {
      const existingPasswords = result.passwords;

      // Filter out any imported passwords that are duplicates
      const nonDuplicatePasswords = importedPasswords.filter(importedPassword => {
        return !existingPasswords.some(existingPassword =>
          existingPassword.title === importedPassword.title &&
          existingPassword.username === importedPassword.username
        );
      });

      // If there are new (non-duplicate) passwords, add them to the storage
      if (nonDuplicatePasswords.length > 0) {
        const updatedPasswords = existingPasswords.concat(nonDuplicatePasswords);
        chrome.storage.local.set({ passwords: updatedPasswords }, function () {
          displayPasswords(1); // Re-display passwords after import
          alert(nonDuplicatePasswords.length + ' new password(s) added.');
        });
      } else {
        alert('No new passwords to add, all entries are duplicates.');
      }
    });
  };
  reader.readAsText(file);
}

// Attach event listener for the search input
document.getElementById('searchInput').addEventListener('input', function () {
  displayPasswords(1); // Re-display passwords with the search filter
});

function displayPasswords(page = 1) {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  chrome.storage.local.get({ passwords: [] }, function (result) {
    let passwords = result.passwords;

    if (searchTerm) {
      passwords = passwords.filter(password =>
        password.title.toLowerCase().includes(searchTerm) ||
        password.username.toLowerCase().includes(searchTerm)
      );
    }

    totalPages = Math.ceil(passwords.length / itemsPerPage);
    currentPage = Math.min(page, totalPages);

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedPasswords = passwords.slice(start, end);

    const tbody = document.getElementById('passwordTable').querySelector('tbody');
    tbody.innerHTML = '';
    paginatedPasswords.forEach((data, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.title}</td>
        <td>${data.username}</td>
        <td>
          <input type="password" value="${atob(data.password)}" readonly class="form-control">
        </td>
        <td>
          <div class="d-flex justify-content-between">
            <button class="toggle-visibility btn btn-secondary" data-bs-toggle="tooltip" title="Show/Hide Password">
              <i class="fas fa-eye"></i>
            </button>
            <button class="copy-password btn btn-primary" data-password="${atob(data.password)}" data-bs-toggle="tooltip" title="Copy Password">
              <i class="fas fa-copy"></i>
            </button>
            <button class="edit btn btn-info" data-index="${start + index}" data-bs-toggle="tooltip" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete btn btn-danger" data-index="${start + index}" data-bs-toggle="tooltip" title="Delete">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    attachRowEventListeners();
    updatePagination();
  });
}

// Update attachRowEventListeners function to handle the copy functionality
function attachRowEventListeners() {
  document.querySelectorAll('.toggle-visibility').forEach(button => {
    button.addEventListener('click', function () {
      togglePasswordVisibility(this);
    });
  });

  document.querySelectorAll('.copy-password').forEach(button => {
    button.addEventListener('click', function () {
      const password = this.getAttribute('data-password');
      navigator.clipboard.writeText(password).then(() => {
        // alert('Password copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy password: ', err);
      });
    });
  });

  document.querySelectorAll('.edit').forEach(button => {
    button.addEventListener('click', function () {
      editPassword(this.getAttribute('data-index'));
    });
  });

  document.querySelectorAll('.delete').forEach(button => {
    button.addEventListener('click', function () {
      deletePassword(this.getAttribute('data-index'));
    });
  });
}

// Add event listener for the Delete All button
document.getElementById('deleteAll').addEventListener('click', function () {
  if (confirm('Are you sure you want to delete all passwords? This action cannot be undone.')) {
    chrome.storage.local.set({ passwords: [] }, function () {
      // Clear the table and update pagination
      displayPasswords(1);
      alert('All passwords have been deleted.');
    });
  }
});

document.getElementById('togglePassword').addEventListener('click', function () {
  const passwordInput = document.getElementById('password');
  const icon = this.querySelector('i');

  // Toggle the password visibility and icon
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
});
