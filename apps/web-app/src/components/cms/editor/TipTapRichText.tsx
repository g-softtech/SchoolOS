"use client";

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface TipTapRichTextProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function TipTapRichText({ value, onChange, readOnly = false }: TipTapRichTextProps) {
  const editor = useEditor({
    extensions: [
      StarterKit, // Provides safe, sanitized base HTML elements
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      {!readOnly && (
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex gap-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded ${editor.isActive('bold') ? 'bg-gray-200 font-bold' : 'hover:bg-gray-200'}`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded ${editor.isActive('italic') ? 'bg-gray-200 italic' : 'hover:bg-gray-200'}`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-sm rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-200'}`}
          >
            H2
          </button>
        </div>
      )}
      <div className="p-4 prose max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
