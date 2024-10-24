// Attach event listeners
document.getElementById('passwordForm').addEventListener('submit', savePassword);
document.getElementById('suggestPassword').addEventListener('click', suggestPassword);
document.getElementById('exportData').addEventListener('click', exportData);
document.getElementById('importFile').addEventListener('change', importData);
document.getElementById('showPassword').addEventListener('change', togglePasswordVisibilityForm);
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
function togglePasswordVisibilityForm() {
  const passwordInput = document.getElementById('password');
  const showPasswordCheckbox = document.getElementById('showPassword');
  if (showPasswordCheckbox.checked) {
    passwordInput.type = 'text';
  } else {
    passwordInput.type = 'password';
  }
}

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
        <td class="d-flex justify-content-between">
          <button class="toggle-visibility btn btn-secondary">Show</button>
          <button class="edit btn btn-info" data-index="${start + index}">Edit</button>
          <button class="delete btn btn-danger" data-index="${start + index}">Delete</button>
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

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.classList.add('page-item');
    if (i === currentPage) li.classList.add('active');
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', function (e) {
      e.preventDefault();
      displayPasswords(i);
    });
    pagination.appendChild(li);
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
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = 'Hide';
  } else {
    input.type = 'password';
    button.textContent = 'Show';
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
    const passwords = contents.split('\n').map(line => {
      const [title, username, password] = line.split(', ').map(item => item.split(': ')[1]);
      return { title, username, password: btoa(password) };
    });

    chrome.storage.local.get({ passwords: [] }, function (result) {
      const existingPasswords = result.passwords;
      const updatedPasswords = existingPasswords.concat(passwords);
      chrome.storage.local.set({ passwords: updatedPasswords }, function () {
        displayPasswords(1);
      });
    });
  };
  reader.readAsText(file);
}

// Attach event listener for the search input
document.getElementById('searchInput').addEventListener('input', function () {
  displayPasswords(1); // Re-display passwords with the search filter
});

function displayPasswords(page = 1) {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase(); // Get search term and convert to lowercase

  chrome.storage.local.get({ passwords: [] }, function (result) {
    let passwords = result.passwords;

    // Filter passwords based on the search term (if search term is not empty)
    if (searchTerm) {
      passwords = passwords.filter(password => 
        password.title.toLowerCase().includes(searchTerm) || 
        password.username.toLowerCase().includes(searchTerm)
      );
    }

    totalPages = Math.ceil(passwords.length / itemsPerPage); // Calculate total pages
    currentPage = page; // Update current page

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedPasswords = passwords.slice(start, end);

    const tbody = document.getElementById('passwordTable').querySelector('tbody');
    tbody.innerHTML = ''; // Clear existing rows
    paginatedPasswords.forEach((data, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.title}</td>
        <td>${data.username}</td>
        <td>
          <input type="password" value="${atob(data.password)}" readonly class="form-control">
        </td>
        <td class="d-flex justify-content-between">
          <button class="toggle-visibility btn btn-secondary">Show</button>
          <button class="edit btn btn-info" data-index="${start + index}">Edit</button>
          <button class="delete btn btn-danger" data-index="${start + index}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Attach event listeners for the rows
    attachRowEventListeners();

    // Update pagination
    updatePagination();
  });
}
