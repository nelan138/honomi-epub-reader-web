# Honomi EPUB Handling Summary

## 1. Importing EPUB Files

When the user imports an EPUB through the browser, Honomi receives it as a JavaScript `File` object.

That `File` still contains the complete EPUB.

Our process will be:

```text
EPUB file
→ Browser File object
→ Convert to raw bytes
→ fflate decompresses it
→ Honomi can access the files inside
```

We are using `fflate` so we do not need to build ZIP decompression ourselves.

---

## 2. What We Get From the EPUB

After `fflate` decompresses the EPUB, we get the individual files that make up the book.

For example:

```text
Book
├── metadata
├── chapter files
├── CSS
├── cover image
├── illustrations
└── other resources
```

These extracted files initially exist as raw bytes.

Honomi's engine can then interpret them depending on what they are.

For example:

```text
chapter.xhtml bytes → text/HTML
cover.jpg bytes      → image
book.css bytes       → CSS
```

---

## 3. Storing Books in IndexedDB

Honomi decides what parts of the imported EPUB should be stored.

Our general idea is to extract the book once during import and store the useful information in IndexedDB.

For example:

```text
Book record

Index | Metadata | Contents
```

Metadata can contain things such as:

```text
Title
Author
Language
Import date
```

Contents can contain things such as:

```text
Chapters
Images
CSS
Cover
Other EPUB resources
```

IndexedDB can store both normal JavaScript data and binary data such as `Blob`s.

The engine can retrieve those stored resources later when the user opens the book.

---

## 4. How We Handle EPUB HTML

EPUB books already contain XHTML/HTML.

However, different publishers can use different class names and styling.

For example:

```html
<p class="main-text">
    これは本文です。
</p>
```

Another publisher might use:

```html
<p class="novel-paragraph">
    これは本文です。
</p>
```

Honomi should not depend on names such as `main-text` or `novel-paragraph`.

Instead, we rely mainly on the standard HTML element:

```text
<p> means paragraph
```

---

## 5. Preserve Meaningful HTML Semantics

We do not want to discard the EPUB's HTML structure completely.

Instead, Honomi will understand the important standard elements and use them in our own reader system.

For example:

```text
<p>        → normal book text
<ruby>     → ruby structure
<rt>       → furigana
<img>      → illustration
<h1>       → heading
<a>        → link
```

Example:

```html
<ruby>
    漢字
    <rt>かんじ</rt>
</ruby>
```

Honomi understands this as:

```text
漢字 = main text
かんじ = furigana
```

Then Honomi can control how that furigana is displayed.

---

## 6. Publisher Classes

We should not rely on publisher-specific classes, but we also do not need to delete them.

For example:

```html
<p class="special-dialogue">
    「こんにちは」
</p>
```

Honomi still knows this is a paragraph because it is a `<p>`.

If we do not understand `special-dialogue`, the text still works normally.

The publisher's class can remain in case its CSS adds useful special styling.

So our approach is:

```text
Standard HTML semantics → Honomi understands and controls

Publisher classes → preserved when possible, but not required
```

---

## 7. Publisher CSS and Honomi CSS

The publisher's CSS also comes with the EPUB.

We want to preserve it so special book styling can continue working.

However, Honomi's reader rules should take priority for things we want the user to control.

For example, the publisher might define:

```css
p {
    font-size: 16px;
}
```

But if the user changes the font size in Honomi, our reader style should override that.

So the priority is roughly:

```text
Honomi / user reader settings
        ↓
Publisher CSS
        ↓
Default styling
```

Honomi will control things such as:

```text
Font size
Line spacing
Margins
Themes/colors
Ruby/furigana size
Writing direction
Reader layout
```

Publisher CSS can still handle styling that Honomi does not override.

---

## 8. Overall Honomi Approach

The full idea is:

```text
User imports EPUB
        ↓
Browser gives Honomi a File object
        ↓
Convert it into raw bytes
        ↓
fflate decompresses the EPUB
        ↓
Honomi reads metadata, chapters, images, CSS, etc.
        ↓
Store the useful resources in IndexedDB
        ↓
When opening the book, Honomi reads those resources
        ↓
Understand standard HTML semantics
        ↓
Preserve publisher-specific classes/CSS where useful
        ↓
Apply Honomi's own reader styling on top
        ↓
Display the book
```

The main goal is not to completely rebuild the EPUB into something unrelated.

Instead, Honomi takes the EPUB's existing structure, understands the important parts, keeps useful publisher information, and places our own reader controls on top of it.
