import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface Option {
  value: string;
  label: string;
  isActive?: boolean;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  showSelectAll?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  disabled = false,
  showSelectAll = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optionValue: string) => {
    const newSelection = selectedValues.includes(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allValues = filteredOptions.map(option => option.value);
    onSelectionChange(allValues);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option ? option.label : selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center justify-between">
          <span className={selectedValues.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
            {getDisplayText()}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8"
                autoFocus
              />
            </div>
            {showSelectAll && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex-1 h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex-1 h-7 text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleToggleOption(option.value)}
                  >
                    <span className={isSelected ? 'text-blue-600 font-medium' : 'text-gray-900'}>
                      {option.label}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
