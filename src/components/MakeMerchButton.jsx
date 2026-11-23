import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shirt } from 'lucide-react';

// "Frame My Elements": opens the framed-poster designer with the name(s) and the already verified
// elements from this result, so the customer never has to type them again. The server re-checks them.
export default function MakeMerchButton({ people }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const names = (people || []).filter((p) => p?.fullName).map((p) => ({ name: p.fullName, elements: (p.elements || []).map((e) => e.symbol) }));
  if (names.length === 0) return null;
  return (
    <div className="my-6 text-center">
      <button type="button" data-testid="make-merch" onClick={() => navigate('/merch', { state: { merch: { names, productId: 'poster' } } })}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold">
        <Shirt size={20} aria-hidden="true" />{t('merch.makeMine')}
      </button>
    </div>
  );
}
