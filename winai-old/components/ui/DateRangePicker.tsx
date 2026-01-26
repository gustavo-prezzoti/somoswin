import React from 'react';
import { Select } from './Select';

interface DateRangePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="today">Hoje</option>
      <option value="last_7_days">Últimos 7 dias</option>
      <option value="last_30_days">Últimos 30 dias</option>
      <option value="this_month">Este Mês</option>
      <option value="last_month">Mês Passado</option>
    </Select>
  );
};
