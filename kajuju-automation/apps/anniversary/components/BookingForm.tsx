'use client';

import { isValidEmail, isValidPhone } from '@/lib/validation';

export interface ContactFormValues {
  name: string;
  phone: string;
  email: string;
  promoCode: string;
}

interface BookingFormProps {
  values: ContactFormValues;
  onChange: (values: ContactFormValues) => void;
  touched: { phone: boolean; email: boolean };
  onBlurField: (field: 'phone' | 'email') => void;
}

export default function BookingForm({ values, onChange, touched, onBlurField }: BookingFormProps) {
  const phoneError = touched.phone && values.phone.trim() && !isValidPhone(values.phone);
  const emailError = touched.email && values.email.trim() && !isValidEmail(values.email);

  function set<K extends keyof ContactFormValues>(key: K, val: ContactFormValues[K]) {
    onChange({ ...values, [key]: val });
  }

  return (
    <div className="rounded-[10px] border border-barn-cardborder bg-white p-5 space-y-4">
      <div>
        <label className="block text-[0.75rem] uppercase tracking-wide text-gray-500 font-sans-label mb-1">
          Full name
        </label>
        <input
          type="text"
          value={values.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Your name"
          className="w-full rounded-md border border-barn-cardborder px-3 py-2 text-sm font-sans-label focus:outline-none focus:border-barn-green"
        />
      </div>

      <div>
        <label className="block text-[0.75rem] uppercase tracking-wide text-gray-500 font-sans-label mb-1">
          Phone number
        </label>
        <input
          type="tel"
          value={values.phone}
          onChange={e => set('phone', e.target.value)}
          onBlur={() => onBlurField('phone')}
          placeholder="e.g. 0712 345 678"
          className={`w-full rounded-md border px-3 py-2 text-sm font-sans-label focus:outline-none ${
            phoneError ? 'border-red-400' : 'border-barn-cardborder focus:border-barn-green'
          }`}
        />
        {phoneError && (
          <p className="text-[0.75rem] text-red-600 mt-1 font-sans-label">
            Please enter a valid phone number.
          </p>
        )}
      </div>

      <div>
        <label className="block text-[0.75rem] uppercase tracking-wide text-gray-500 font-sans-label mb-1">
          Email
        </label>
        <input
          type="email"
          value={values.email}
          onChange={e => set('email', e.target.value)}
          onBlur={() => onBlurField('email')}
          placeholder="you@example.com"
          className={`w-full rounded-md border px-3 py-2 text-sm font-sans-label focus:outline-none ${
            emailError ? 'border-red-400' : 'border-barn-cardborder focus:border-barn-green'
          }`}
        />
        {emailError && (
          <p className="text-[0.75rem] text-red-600 mt-1 font-sans-label">
            Please enter a valid email address.
          </p>
        )}
      </div>

      <div>
        <label className="block text-[0.75rem] uppercase tracking-wide text-gray-500 font-sans-label mb-1">
          Invitation Code
        </label>
        <input
          type="text"
          value={values.promoCode}
          onChange={e => set('promoCode', e.target.value)}
          placeholder="e.g. IB119"
          className="w-full rounded-md border border-barn-cardborder px-3 py-2 text-sm font-sans-label focus:outline-none focus:border-barn-green uppercase"
        />
      </div>
    </div>
  );
}
