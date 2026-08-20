import { getAllCategories } from '../../../database/category-repository.ts';

export const STRING_FORM_RULES = {
   maxLength: 20,
   pattern: /^[^\p{C}/<>\\]+$/u, // no control chars or common injection chars
};

type FormType =
   | 'book-name'
   | 'category-name'
   | 'category-selection'
   | 'confirmation'
   | 'search-book';
export default async function openFormFor(type: FormType): Promise<string | boolean | null> {
   switch (type) {
      case 'book-name':
         return await getNewBookNameForm();
      case 'category-name':
         return await getNewCategoryNameForm();
      case 'category-selection':
         return await selectCategoryForm();
      case 'confirmation':
         return await askForUserConfirmation();
      case 'search-book':
         return await getStringForm('Search book', 'Enter book name');
      default:
         return null;
   }
}

function getNewBookNameForm() {
   return getStringForm('Rename to', 'new name');
}

function getNewCategoryNameForm() {
   return getStringForm('New category', 'category name');
}

async function selectCategoryForm() {
   const categories = await getAllCategories();
   const options = categories.map((category) => category.name);
   return getOptionForm('Move to', options);
}

function getStringForm(title: string, placeholder = 'Enter text here'): Promise<string | null> {
   return new Promise((resolve, reject) => {
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

      const input = modal.querySelector('.form-input')! as HTMLInputElement;
      const charCount = modal.querySelector('.form-char-count')!;
      const errorMsg = modal.querySelector('.form-error-msg')!;
      const submitBtn = modal.querySelector('.form-btn--submit')!;
      const cancelBtn = modal.querySelector('.form-btn--cancel')!;

      requestAnimationFrame(() => input.focus());

      function validate(value: string): string | null {
         if (!value) return 'Name cannot be empty.';
         if (value.length > STRING_FORM_RULES.maxLength) {
            return `Must be ${STRING_FORM_RULES.maxLength} characters or fewer.`;
         }
         if (!STRING_FORM_RULES.pattern.test(value)) {
            return 'Name contains invalid characters.';
         }
         return null;
      }

      function showError(message: string) {
         errorMsg.textContent = message;
         input.classList.add('form-input--error');
         input.focus();
      }

      function clearError() {
         errorMsg.textContent = '';
         input.classList.remove('form-input--error');
      }

      function submit() {
         const value = input.value.trim();
         const error = validate(value);
         if (error) {
            showError(error);
            return;
         }
         closeModal(overlay, () => resolve(value));
      }

      function cancel() {
         closeModal(overlay, () => resolve(null));
      }

      input.addEventListener('input', () => {
         const len = input.value.length;
         charCount.textContent = `${len} / ${STRING_FORM_RULES.maxLength}`;
         charCount.classList.toggle(
            'form-char-count--near',
            len >= STRING_FORM_RULES.maxLength * 0.85,
         );
         charCount.classList.toggle(
            'form-char-count--over',
            len >= STRING_FORM_RULES.maxLength,
         );
         clearError();
      });

      submitBtn.addEventListener('click', submit);
      cancelBtn.addEventListener('click', cancel);
      overlay.addEventListener('click', (e) => {
         if (e.target === overlay) cancel();
      });
      modal.addEventListener('keydown', (e) => {
         if (e.key === 'Enter') submit();
         if (e.key === 'Escape') cancel();
      });

      document.body.appendChild(overlay);
   });
}

function getOptionForm(
   title: string,
   options: string[],
): Promise<string | null> {
   return new Promise((resolve) => {
      const { overlay, modal } = createModal();

      modal.innerHTML = `
         <h3 class="form-title">${title}</h3>
         <ul class="form-option-list">
            ${
         options.map((option) => `
               <li>
                  <button type="button" class="form-option-btn">${option}</button>
               </li>
            `).join('')
      }
         </ul>
         <div class="form-actions">
            <button type="button" class="form-btn form-btn--cancel">Cancel</button>
         </div>
      `;

      function cancel() {
         closeModal(overlay, () => resolve(null));
      }

      modal.querySelectorAll('.form-option-btn').forEach((btn, i) => {
         btn.addEventListener('click', () => {
            closeModal(overlay, () => resolve(options[i]));
         });
      });

      modal.querySelector('.form-btn--cancel')!.addEventListener(
         'click',
         cancel,
      );
      overlay.addEventListener('click', (e) => {
         if (e.target === overlay) cancel();
      });
      modal.addEventListener('keydown', (e) => {
         if (e.key === 'Escape') cancel();
      });

      document.body.appendChild(overlay);
   });
}

function askForUserConfirmation(message = 'Are you sure?'): Promise<boolean> {
   return new Promise((resolve) => {
      const { overlay, modal } = createModal();

      modal.innerHTML = `
         <h3 class="form-title">${message}</h3>
         <div class="form-actions">
            <button type="button" class="form-btn form-btn--cancel">Cancel</button>
            <button type="button" class="form-btn form-btn--danger">Delete</button>
         </div>
      `;

      const confirmBtn = modal.querySelector(
         '.form-btn--danger',
      )! as HTMLButtonElement;
      const cancelBtn = modal.querySelector(
         '.form-btn--cancel',
      )! as HTMLButtonElement;

      requestAnimationFrame(() => confirmBtn.focus());

      confirmBtn.addEventListener(
         'click',
         () => closeModal(overlay, () => resolve(true)),
      );
      cancelBtn.addEventListener(
         'click',
         () => closeModal(overlay, () => resolve(false)),
      );
      overlay.addEventListener('click', (e) => {
         if (e.target === overlay) closeModal(overlay, () => resolve(false));
      });
      modal.addEventListener('keydown', (e) => {
         if (e.key === 'Escape') closeModal(overlay, () => resolve(false));
      });

      document.body.appendChild(overlay);
   });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createModal() {
   const overlay = document.createElement('div');
   overlay.classList.add('form-overlay');

   const modal = document.createElement('div');
   modal.classList.add('form-modal');
   modal.setAttribute('role', 'dialog');
   modal.setAttribute('aria-modal', 'true');

   overlay.appendChild(modal);

   return { overlay, modal };
}

function closeModal(overlay: HTMLDivElement, callback?: () => void) {
   overlay.classList.add('form-overlay--closing');
   overlay.addEventListener('animationend', () => {
      overlay.remove();
      callback?.();
   }, { once: true });
}
