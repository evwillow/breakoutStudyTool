"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; // ✅ Ensure Next.js Image component is used

export default function Flashcards() {
  const [images, setImages] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/getImages")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setImages(data);
        } else {
          console.error("Error: API did not return an array", data);
        }
      })
      .catch(err => console.error("Error fetching images:", err));
  }, []);

  if (images.length === 0) return <p className="text-center text-gray-500">Loading images...</p>;

  return (
    <div className="flex flex-col items-center">
      {/* Debugging: Show Image URL */}
      <p className="text-sm text-gray-500 mt-2">{images[index]?.url}</p>

      {/* Use Next.js Image component for optimization */}
      <div className="relative w-[500px] h-[300px]">
        <Image
          src={images[index]?.url}
          alt={`Flashcard ${index + 1}`}
          layout="fill"
          objectFit="contain"
          className="rounded-lg shadow-lg"
          onError={(e) => {
            console.error("Image failed to load:", e.target.src);
          }}
        />
      </div>

      <div className="mt-4 flex space-x-4">
        <button
          onClick={() => setIndex((index - 1 + images.length) % images.length)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Previous
        </button>
        <button
          onClick={() => setIndex((index + 1) % images.length)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
