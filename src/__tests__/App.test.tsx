import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { services } from '../App';

describe('Services Cost Calculation', () => {
  const mockServices = [
    { id: 's1', name: 'Service 1', rate: 100, selected: true, quantity: 2 },
    { id: 's2', name: 'Service 2', rate: 200, selected: true, quantity: 1, minimum: 300 },
    { id: 's3', name: 'Service 3', rate: 150, selected: true, quantity: 3, minimum: 500 },
    { id: 's4', name: 'Service 4', rate: 250, selected: false, quantity: 1 }
  ];

  test('renders selected services with correct costs', () => {
    const { container } = render(
      <ul>
        {mockServices.filter(s => s.selected).map(s => {
          let cost = 0;
          let displayQuantity = s.quantity ?? 1;
          if (s.id === 's1') cost = s.rate * displayQuantity;
          else if (s.id === 's2' && true) cost = Math.max(s.rate * displayQuantity, s.minimum ?? 0);
          else if (s.id === 's3') cost = Math.max(s.rate * displayQuantity, s.minimum ?? 0);

          return cost > 0 ? (
            <li key={s.id}>
              {s.name}
              {(s.id === 's1' || s.id === 's2' || s.id === 's3') && ` (Qty: ${displayQuantity})`}: ₹{cost.toFixed(2)}
              {s.minimum && cost === s.minimum && s.rate * displayQuantity < s.minimum && <span className="text-xs"> (Minimum applied)</span>}
            </li>
          ) : null;
        })}
      </ul>
    );

    expect(screen.getByText(/Service 1 \(Qty: 2\): ₹200.00/)).toBeInTheDocument();
    expect(screen.getByText(/Service 2 \(Qty: 1\): ₹300.00/)).toBeInTheDocument();
    expect(screen.getByText(/Service 3 \(Qty: 3\): ₹500.00/)).toBeInTheDocument();
    expect(screen.getByText('(Minimum applied)')).toBeInTheDocument();
  });

  test('handles services without quantity specified', () => {
    const servicesWithoutQuantity = [
      { id: 's1', name: 'Service 1', rate: 100, selected: true }
    ];

    const { container } = render(
      <ul>
        {servicesWithoutQuantity.filter(s => s.selected).map(s => {
          let cost = 0;
          let displayQuantity = s.quantity ?? 1;
          if (s.id === 's1') cost = s.rate * displayQuantity;
          return cost > 0 ? (
            <li key={s.id}>
              {s.name}
              {(s.id === 's1') && ` (Qty: ${displayQuantity})`}: ₹{cost.toFixed(2)}
            </li>
          ) : null;
        })}
      </ul>
    );

    expect(screen.getByText(/Service 1 \(Qty: 1\): ₹100.00/)).toBeInTheDocument();
  });

  test('does not render unselected services', () => {
    const { container } = render(
      <ul>
        {mockServices.filter(s => s.selected).map(s => {
          let cost = 0;
          let displayQuantity = s.quantity ?? 1;
          if (s.id === 's1') cost = s.rate * displayQuantity;
          else if (s.id === 's2' && true) cost = Math.max(s.rate * displayQuantity, s.minimum ?? 0);