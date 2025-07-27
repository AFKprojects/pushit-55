import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ArchiveSearchProps {
  onSearch: (pollId: string) => void;
  isLoading: boolean;
}

const ArchiveSearch = ({ onSearch, isLoading }: ArchiveSearchProps) => {
  const [searchId, setSearchId] = useState('');

  const handleSearch = () => {
    if (searchId.trim()) {
      onSearch(searchId.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-black/20 border border-orange-500/20 rounded-xl p-4 mb-6">
      <div className="flex gap-2">
        <Input
          placeholder="Search by poll ID..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyPress={handleKeyPress}
          className="bg-black/20 border-orange-500/30 text-orange-200 placeholder:text-orange-300/60"
        />
        <Button
          onClick={handleSearch}
          disabled={!searchId.trim() || isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Search size={16} />
        </Button>
      </div>
    </div>
  );
};

export default ArchiveSearch;