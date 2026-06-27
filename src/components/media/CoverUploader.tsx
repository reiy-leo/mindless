import { useRef } from 'react';
import { Image, Upload, Trash2 } from 'lucide-react';

interface CoverUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function CoverUploader({ value, onChange }: CoverUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-full">
      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {value ? (
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Image className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="absolute top-1 right-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
      </div>
      {value && (
        <div className="absolute bottom-1 right-1">
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
