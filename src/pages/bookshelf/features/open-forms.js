import { getAllCategories } from "../../../database/category-repository.js";

export const STRING_FORM_RULES = {
   maxLength: 20,
   pattern: /^[^\p{C}/<>\\]+$/u, // no control chars or common injection chars
};

/**
 * Opens a modal form.
 *
 * @param {"book-name" | "category-name" | "category-selection" | "confirmation"} type
 * @returns {Promise<string | boolean>}
 */
export default async function openFormFor(type) {
   switch (type) {
      case "book-name":
         return getNewBookNameForm();
      case "category-name":
         return getNewCategoryNameForm();
      case "category-selection":
         return selectCategoryForm();
      case "confirmation":
         return askForUserConfirmation();
      case "search-book":
         return getStringForm("Search books", "Enter title, author, or language");
      default:
         throw new Error(`Unknown form type: ${type}`);
   }
}

function getNewBookNameForm() {
   return getStringForm("Rename to", "new name");
}

function getNewCategoryNameForm() {
   return getStringForm("New category", "category name");
}

async function selectCategoryForm() {
   const categories = await getAllCategories();
   const options = categories.map((category) => category.name);
   return getOptionForm("Move to", options);
}

/**
 * Shows a modal with a text input.
 *
 * @param {string} title
 * @param {string} placeholder
 * @returns {Promise<string | null>} Resolves with the entered string, or null if cancelled.
 */
function getStringForm(title, placeholder) {
   return new Promise((resolve) => {
      const { overlay, modal } = createModal();

      modal.innerHTML = `
         <h3 class="form-title">${title}</h3>
         <div class="form-input-wrapper">
            <input
               class="form-input"
               type="text"
               placeholder="${placeholder}"
               autocomplete="off"
               maxlength="${STRING_FORM_RULES.maxLength}"
               required
            />
            <span class="form-char-count">0 / ${STRING_FORM_RULES.maxLength}</span>
         </div>
         <p class="form-error-msg" aria-live="polite"></p>
         <div class="form-actions">
            <button type="button" class="form-btn form-btn--cancel">Cancel</button>
            <button type="button" class="form-btn form-btn--submit">Confirm</button>
         </div>
      `;

      const input = modal.querySelector(".form-input");
      const charCount = modal.querySelector(".form-char-count");
      const errorMsg = modal.querySelector(".form-error-msg");
      const submitBtn = modal.querySelector(".form-btn--submit");
      const cancelBtn = modal.querySelector(".form-btn--cancel");

      requestAnimationFrame(() => input.focus());

      function validate(value) {
         if (!value) return "Name cannot be empty.";
         if (value.length > STRING_FORM_RULES.maxLength) return `Must be ${STRING_FORM_RULES.maxLength} characters or fewer.`;
         if (!STRING_FORM_RULES.pattern.test(value)) return "Name contains invalid characters.";
         return null;
      }

      function showError(message) {
         errorMsg.textContent = message;
         input.classList.add("form-input--error");
         input.focus();
      }

      function clearError() {
         errorMsg.textContent = "";
         input.classList.remove("form-input--error");
      }

      function submit() {
         const value = input.value.trim();
         const error = validate(value);
         if (error) { showError(error); return; }
         closeModal(overlay, () => resolve(value));
      }

      function cancel() {
         closeModal(overlay, () => resolve(null));
      }

      input.addEventListener("input", () => {
         const len = input.value.length;
         charCount.textContent = `${len} / ${STRING_FORM_RULES.maxLength}`;
         charCount.classList.toggle("form-char-count--near", len >= STRING_FORM_RULES.maxLength * 0.85);
         charCount.classList.toggle("form-char-count--over", len >= STRING_FORM_RULES.maxLength);
         clearError();
      });

      submitBtn.addEventListener("click", submit);
      cancelBtn.addEventListener("click", cancel);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) cancel(); });
      modal.addEventListener("keydown", (e) => {
         if (e.key === "Enter") submit();
         if (e.key === "Escape") cancel();
      });

      document.body.appendChild(overlay);
   });
}

/**
 * Shows a modal with a list of selectable options.
 *
 * @param {string} title
 * @param {string[]} options
 * @returns {Promise<string | null>} Resolves with the chosen option, or null if cancelled.
 */
function getOptionForm(title, options) {
   return new Promise((resolve) => {
      const { overlay, modal } = createModal();

      modal.innerHTML = `
         <h3 class="form-title">${title}</h3>
         <ul class="form-option-list">
            ${options.map((option) => `
               <li>
                  <button type="button" class="form-option-btn">${option}</button>
               </li>
            `).join("")}
         </ul>
         <div class="form-actions">
            <button type="button" class="form-btn form-btn--cancel">Cancel</button>
         </div>
      `;

      function cancel() {
         closeModal(overlay, () => resolve(null));
      }

      modal.querySelectorAll(".form-option-btn").forEach((btn, i) => {
         btn.addEventListener("click", () => {
            closeModal(overlay, () => resolve(options[i]));
         });
      });

      modal.querySelector(".form-btn--cancel").addEventListener("click", cancel);
      overlay.addEventListener("click", (e) => {
         if (e.target === overlay) cancel();
      });
      modal.addEventListener("keydown", (e) => {
         if (e.key === "Escape") cancel();
      });

      document.body.appendChild(overlay);
   });
}

/**
 * Shows a confirmation modal.
 *
 * @param {string} [message="Are you sure?"]
 * @returns {Promise<boolean>} Resolves with true if confirmed, false if cancelled.
 */
function askForUserConfirmation(message = "Are you sure?") {
   return new Promise((resolve) => {
      const { overlay, modal } = createModal();

      modal.innerHTML = `
         <h3 class="form-title">${message}</h3>
         <div class="form-actions">
            <button type="button" class="form-btn form-btn--cancel">Cancel</button>
            <button type="button" class="form-btn form-btn--danger">Delete</button>
         </div>
      `;

      const confirmBtn = modal.querySelector(".form-btn--danger");
      const cancelBtn = modal.querySelector(".form-btn--cancel");

      requestAnimationFrame(() => confirmBtn.focus());

      confirmBtn.addEventListener("click", () => closeModal(overlay, () => resolve(true)));
      cancelBtn.addEventListener("click", () => closeModal(overlay, () => resolve(false)));
      overlay.addEventListener("click", (e) => {
         if (e.target === overlay) closeModal(overlay, () => resolve(false));
      });
      modal.addEventListener("keydown", (e) => {
         if (e.key === "Escape") closeModal(overlay, () => resolve(false));
      });

      document.body.appendChild(overlay);
   });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createModal() {
   const overlay = document.createElement("div");
   overlay.classList.add("form-overlay");

   const modal = document.createElement("div");
   modal.classList.add("form-modal");
   modal.setAttribute("role", "dialog");
   modal.setAttribute("aria-modal", "true");

   overlay.appendChild(modal);

   return { overlay, modal };
}

function closeModal(overlay, callback) {
   overlay.classList.add("form-overlay--closing");
   overlay.addEventListener("animationend", () => {
      overlay.remove();
      callback?.();
   }, { once: true });
}