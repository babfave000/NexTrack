// src/pages/Inventory/BrandForm.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';

// Function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

export default function BrandForm() {
  const [brandName, setBrandName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const brands = useLiveQuery(() => db.brands.orderBy('name').toArray(), []);

  const handleAddBrand = async () => {
    const trimmedName = brandName.trim();

    if (!trimmedName) {
      setError('Brand name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const existing = await db.brands
        .where('name')
        .equalsIgnoreCase(trimmedName)
        .first();

      if (existing) {
        setError('Brand already exists.');
        return;
      }

      await db.brands.add({
        name: capitalizeWords(trimmedName),
        userId: 0
      });
      setBrandName('');
    } catch (err) {
      console.error('Failed to add brand:', err);
      setError('An error occurred while adding the brand.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrandName(capitalizeWords(e.target.value));
  };

  return (
    <div className="p-4 border rounded shadow bg-white">
      <h2 className="text-lg font-semibold mb-3">➕ Add Brand</h2>

      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={brandName}
          onChange={handleInputChange}
          placeholder="Enter brand name"
          className="border px-3 py-2 rounded w-full"
          disabled={loading}
        />
        <button
          onClick={handleAddBrand}
          className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>

      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}

      <div className="mt-6">
        <h3 className="font-medium mb-2">📋 Existing Brands</h3>
        {brands?.length === 0 ? (
          <p className="text-gray-500">No brands added yet.</p>
        ) : (
          <ul className="list-disc ml-5 space-y-1 text-sm">
            {brands?.map((brand) => (
              <li key={brand.id}>{brand.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}