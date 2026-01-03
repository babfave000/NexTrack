// src/pages/Inventory/CategoryForm.tsx

import { useEffect, useRef, useState } from 'react';
import { db } from '../../db/dexie';
import { useAuth } from '../../hooks/useAuth';

// Function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

interface Props {
  categoryToEdit?: { id: number; name: string } | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function CategoryForm({ categoryToEdit, onSave, onCancel }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(categoryToEdit?.name ?? '');
    setError('');
    inputRef.current?.focus();
  }, [categoryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Category name cannot be empty.');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to manage categories.');
      return;
    }

    // Check for duplicates (case-insensitive)
    const existing = await db.categories
      .where('name')
      .equalsIgnoreCase(trimmedName)
      .first();

    if (existing && existing.id !== categoryToEdit?.id) {
      setError('This category name already exists.');
      return;
    }

    try {
      if (categoryToEdit) {
        // Update existing category
        await db.categories.update(categoryToEdit.id, { 
          name: capitalizeWords(trimmedName),
          userId: user.id, // Now guaranteed to be a number
          updatedAt: new Date().toISOString()
        });
      } else {
        // Add new category
        await db.categories.add({ 
          name: capitalizeWords(trimmedName),
          userId: user.id, // Now guaranteed to be a number
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      onSave();
      setName('');
    } catch (error) {
      console.error('Failed to save category:', error);
      setError('Failed to save category. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(capitalizeWords(e.target.value));
    setError('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded bg-white shadow space-y-3 max-w-md"
      aria-label={categoryToEdit ? 'Edit Category Form' : 'Add Category Form'}
    >
      <h2 className="text-lg font-semibold">
        {categoryToEdit ? 'Edit Category' : 'Add Category'}
      </h2>

      <div>
        <label htmlFor="categoryName" className="block text-sm font-medium mb-1">
          Category Name
        </label>
        <input
          id="categoryName"
          type="text"
          className={`w-full border px-3 py-2 rounded ${
            error ? 'border-red-500' : ''
          }`}
          ref={inputRef}
          value={name}
          onChange={handleInputChange}
          aria-invalid={!!error}
          required
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          {categoryToEdit ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}