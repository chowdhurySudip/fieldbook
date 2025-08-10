// Input components for forms

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';

interface InputFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  required = false,
  containerStyle,
  ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError
        ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor="#8E8E93"
        {...inputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface NumberInputProps extends Omit<InputFieldProps, 'keyboardType'> {
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  min,
  max,
  step = 1,
  prefix,
  suffix,
  value,
  onChangeText,
  ...props
}) => {
  const handleTextChange = (text: string) => {
    // Remove non-numeric characters except decimal point
    const numericText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericText.split('.');
    let cleanText = parts[0];
    if (parts.length > 1) {
      cleanText += '.' + parts[1];
    }
    
    // Apply min/max constraints
    const numValue = parseFloat(cleanText);
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        cleanText = min.toString();
      }
      if (max !== undefined && numValue > max) {
        cleanText = max.toString();
      }
    }
    
    onChangeText?.(cleanText);
  };

  const displayValue = value ? `${prefix || ''}${value}${suffix || ''}` : value;

  return (
    <InputField
      {...props}
      value={displayValue}
      onChangeText={handleTextChange}
      keyboardType="numeric"
    />
  );
};

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  value,
  onValueChange,
  error,
  required = false,
  placeholder = 'Select an option...'
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(prev => !prev)}
        style={[styles.input, styles.selectContainer]}
      >
        <Text style={selectedOption ? styles.selectText : styles.selectPlaceholder}>
          {selectedOption?.label || placeholder}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => handleSelect(opt.value)}
              style={styles.dropdownItem}
            >
              <Text style={styles.dropdownText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  inputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  selectContainer: {
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#8E8E93',
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
});
