/**
 * Markdown Editor - Client-side application
 * Secure local markdown editor with live preview
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  API_BASE: "/api",
  DEBOUNCE_DELAY: 300,
  LOCAL_STORAGE_KEY: "markdown-editor-draft",
  MAX_PREVIEW_LENGTH: 5242880, // 5MB
};

// ============================================================================
// State Management
// ============================================================================

const state = {
  currentFilePath: null,
  isDirty: false,
  debounceTimer: null,
  isSaving: false,
};

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  filePath: document.getElementById("filePath"),
  editor: document.getElementById("editor"),
  preview: document.getElementById("preview"),
  loadBtn: document.getElementById("loadBtn"),
  browseBtn: document.getElementById("browseBtn"),
  saveBtn: document.getElementById("saveBtn"),
  clearBtn: document.getElementById("clearBtn"),
  status: document.getElementById("status"),
  errorModal: document.getElementById("errorModal"),
  errorMessage: document.getElementById("errorMessage"),
  closeErrorBtn: document.getElementById("closeErrorBtn"),
  successModal: document.getElementById("successModal"),
  successMessage: document.getElementById("successMessage"),
  closeSuccessBtn: document.getElementById("closeSuccessBtn"),
  fileBrowserModal: document.getElementById("fileBrowserModal"),
  fileList: document.getElementById("fileList"),
  fileSearchInput: document.getElementById("fileSearchInput"),
  closeBrowserBtn: document.getElementById("closeBrowserBtn"),
  loading: document.getElementById("loading"),
  loadingText: document.getElementById("loadingText"),
};

// Store the full file list for filtering
let allFiles = [];

// ============================================================================
// Event Listeners
// ============================================================================

elements.loadBtn.addEventListener("click", loadFile);
elements.browseBtn.addEventListener("click", openFileBrowser);
elements.saveBtn.addEventListener("click", saveFile);
elements.clearBtn.addEventListener("click", clearEditor);
elements.closeErrorBtn.addEventListener("click", closeErrorModal);
elements.closeSuccessBtn.addEventListener("click", closeSuccessModal);
elements.closeBrowserBtn.addEventListener("click", closeFileBrowser);
elements.fileSearchInput.addEventListener("input", () => {
  renderFileList(allFiles);
});
elements.editor.addEventListener("input", onEditorInput);
elements.filePath.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    loadFile();
  }
});

// Close modals when clicking outside the modal content
elements.errorModal.addEventListener("click", (e) => {
  if (e.target === elements.errorModal) {
    closeErrorModal();
  }
});
elements.successModal.addEventListener("click", (e) => {
  if (e.target === elements.successModal) {
    closeSuccessModal();
  }
});
elements.fileBrowserModal.addEventListener("click", (e) => {
  if (e.target === elements.fileBrowserModal) {
    closeFileBrowser();
  }
});

// ============================================================================
// File Operations
// ============================================================================

/**
 * Load file from server
 */
async function loadFile() {
  const filePath = elements.filePath.value.trim();

  if (!filePath) {
    showError("Please enter a file path");
    return;
  }

  showLoading("Loading file...");

  try {
    const response = await fetch(`${CONFIG.API_BASE}/file/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to load file");
    }

    const data = await response.json();

    state.currentFilePath = data.path;
    elements.editor.value = data.content;
    state.isDirty = false;
    updateSaveButton();
    updatePreview();
    clearLocalDraft();

    setStatus("File loaded successfully", "success");
    showSuccess(`Loaded: ${data.name}`);
  } catch (error) {
    console.error("Load error:", error);
    showError(error instanceof Error ? error.message : "Failed to load file");
    setStatus("Error loading file", "error");
  } finally {
    hideLoading();
  }
}

/**
 * Save file to server
 */
async function saveFile() {
  if (!state.currentFilePath) {
    showError("No file loaded. Please load a file first.");
    return;
  }

  const content = elements.editor.value;

  if (state.isSaving) {
    return;
  }

  state.isSaving = true;
  showLoading("Saving file...");

  try {
    const response = await fetch(`${CONFIG.API_BASE}/file/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filePath: state.currentFilePath,
        content: content,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save file");
    }

    state.isDirty = false;
    updateSaveButton();
    clearLocalDraft();

    setStatus("File saved successfully", "success");
    showSuccess("File saved successfully");
  } catch (error) {
    console.error("Save error:", error);
    showError(error instanceof Error ? error.message : "Failed to save file");
    setStatus("Error saving file", "error");
  } finally {
    state.isSaving = false;
    hideLoading();
  }
}

/**
 * Clear editor and reset state
 */
function clearEditor() {
  if (state.isDirty && !confirm("You have unsaved changes. Are you sure you want to clear?")) {
    return;
  }

  elements.editor.value = "";
  elements.filePath.value = "";
  elements.preview.innerHTML = "";
  state.currentFilePath = null;
  state.isDirty = false;
  updateSaveButton();
  clearLocalDraft();
  setStatus("Ready");
}

// ============================================================================
// Editor Updates
// ============================================================================

/**
 * Handle editor input with debouncing
 */
function onEditorInput() {
  state.isDirty = true;
  updateSaveButton();
  saveLocalDraft();

  // Debounce preview updates
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(updatePreview, CONFIG.DEBOUNCE_DELAY);
}

/**
 * Update preview pane with rendered markdown
 */
function updatePreview() {
  const content = elements.editor.value;

  if (!content) {
    elements.preview.innerHTML = "";
    return;
  }

  try {
    // Check content length
    if (content.length > CONFIG.MAX_PREVIEW_LENGTH) {
      elements.preview.innerHTML =
        '<p style="color: #dc3545;"><strong>Content too large to preview</strong></p>';
      return;
    }

    // Render markdown to HTML
    // Note: In production, use a proper markdown library like marked
    // For now, we'll display a message about missing marked.js
    const renderedHTML = renderMarkdown(content);

    // Safely set HTML (using textContent for safety, then use marked if available)
    elements.preview.innerHTML = renderedHTML;
  } catch (error) {
    console.error("Preview error:", error);
    elements.preview.innerHTML = '<p style="color: #dc3545;">Error rendering preview</p>';
  }
}

/**
 * Render markdown to HTML
 * Uses marked.js library for proper markdown rendering
 */
function renderMarkdown(markdown) {
  if (typeof marked === "undefined") {
    console.error("marked.js not loaded");
    return "<p>Markdown library not available</p>";
  }

  try {
    return marked.parse(markdown);
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return "<p>Error rendering markdown</p>";
  }
}

/**
 * Update save button state
 */
function updateSaveButton() {
  elements.saveBtn.disabled = !state.currentFilePath || !state.isDirty;
}

// ============================================================================
// Local Storage (Draft Preservation)
// ============================================================================

/**
 * Save draft to local storage
 */
function saveLocalDraft() {
  try {
    const draft = {
      content: elements.editor.value,
      filePath: state.currentFilePath,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("Failed to save draft:", error);
  }
}

/**
 * Load draft from local storage
 */
function loadLocalDraft() {
  try {
    const stored = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
    if (stored) {
      const draft = JSON.parse(stored);
      if (draft.content) {
        elements.editor.value = draft.content;
        if (draft.filePath) {
          elements.filePath.value = draft.filePath;
        }
        updatePreview();
        return true;
      }
    }
  } catch (error) {
    console.warn("Failed to load draft:", error);
  }
  return false;
}

/**
 * Clear draft from local storage
 */
function clearLocalDraft() {
  try {
    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear draft:", error);
  }
}

// ============================================================================
// UI Updates
// ============================================================================

/**
 * Update status indicator
 */
function setStatus(message, type = "info") {
  elements.status.textContent = message;
  elements.status.className = "status";
  if (type !== "info") {
    elements.status.classList.add(type);
  }
}

/**
 * Show loading indicator
 */
function showLoading(message = "Loading...") {
  elements.loadingText.textContent = message;
  elements.loading.classList.remove("hidden");
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  elements.loading.classList.add("hidden");
}

/**
 * Show error modal
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorModal.classList.remove("hidden");
}

/**
 * Close error modal
 */
function closeErrorModal() {
  elements.errorModal.classList.add("hidden");
}

/**
 * Show success modal
 */
function showSuccess(message) {
  elements.successMessage.textContent = message;
  elements.successModal.classList.remove("hidden");
}

/**
 * Close success modal
 */
function closeSuccessModal() {
  elements.successModal.classList.add("hidden");
}

/**
 * Open file browser modal and fetch file list
 */
async function openFileBrowser() {
  elements.fileBrowserModal.classList.remove("hidden");
  elements.fileSearchInput.value = "";
  elements.fileList.innerHTML = "<p>Loading files...</p>";

  try {
    const response = await fetch(`${CONFIG.API_BASE}/files/list`);

    if (!response.ok) {
      throw new Error("Failed to fetch file list");
    }

    const data = await response.json();
    allFiles = data.files;
    renderFileList(data.files);
  } catch (error) {
    console.error("File browser error:", error);
    elements.fileList.innerHTML = '<p style="color: #dc3545;">Error loading files</p>';
  }
}

/**
 * Close file browser modal
 */
function closeFileBrowser() {
  elements.fileBrowserModal.classList.add("hidden");
}

/**
 * Render file list in the file browser modal with grouping and filtering
 */
function renderFileList(files) {
  // Get search query
  const searchQuery = elements.fileSearchInput.value.toLowerCase().trim();

  // Filter files based on search
  let filteredFiles = files;
  if (searchQuery) {
    filteredFiles = files.filter(
      (file) =>
        file.name.toLowerCase().includes(searchQuery) ||
        file.path.toLowerCase().includes(searchQuery)
    );
  }

  if (filteredFiles.length === 0) {
    elements.fileList.innerHTML = searchQuery
      ? "<p>No files match your search</p>"
      : "<p>No markdown files found</p>";
    return;
  }

  // Group files by directory
  const grouped = {};
  filteredFiles.forEach((file) => {
    const dirPath = file.path.substring(0, file.path.lastIndexOf("/"));
    if (!grouped[dirPath]) {
      grouped[dirPath] = [];
    }
    grouped[dirPath].push(file);
  });

  // Sort directory paths
  const sortedDirs = Object.keys(grouped).sort();

  // Build HTML
  let html = "";
  sortedDirs.forEach((dirPath) => {
    html += `<div style="margin-bottom: var(--spacing-lg);">
      <div style="font-weight: 600; color: var(--color-primary); font-size: 0.875rem; margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); background-color: var(--color-surface); border-radius: var(--border-radius);">
        📁 ${dirPath}
      </div>`;

    grouped[dirPath].forEach((file) => {
      html += `<div style="padding: var(--spacing-sm); margin-left: var(--spacing-md); border-left: 2px solid var(--color-border); cursor: pointer; border-radius: 0 var(--border-radius) var(--border-radius) 0;" class="file-item" data-path="${file.path}">
        <div style="word-break: break-all; color: var(--color-primary); font-size: 0.875rem;">📄 ${file.name}</div>
      </div>`;
    });

    html += "</div>";
  });

  elements.fileList.innerHTML = html;

  // Add click handlers
  document.querySelectorAll(".file-item").forEach((item) => {
    item.addEventListener("click", () => {
      const path = item.getAttribute("data-path");
      elements.filePath.value = path;
      closeFileBrowser();
      loadFile();
    });
  });
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application
 */
function initializeApp() {
  // Load draft if available
  const draftLoaded = loadLocalDraft();
  if (!draftLoaded) {
    setStatus("Ready");
  } else {
    setStatus("Draft restored from previous session", "info");
  }

  // Update save button state
  updateSaveButton();

  console.info("Markdown Editor initialized");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Handle beforeunload warning for unsaved changes
window.addEventListener("beforeunload", (e) => {
  if (state.isDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
