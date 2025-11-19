import React, { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { renderIcon } from '../components/Icons';
import api from '../services/api';
import { usePreferences } from '../services/PreferencesContext';
import '../App.css';
import './WalletPage.css';

interface WalletInfo {
  id: number;
  user_id: number;
  balance: number;
  frozen_balance: number;
  created_at: string;
}

interface WalletTransaction {
  id: number;
  wallet_id: number;
  transaction_type: string;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  related_consultation_id?: number;
  created_at?: string;
}

const incomingTypes = ['PURCHASE', 'UNFREEZE', 'ADJUSTMENT', 'CREDIT'];

const WalletPage: React.FC = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { language } = usePreferences();
  const isEnglish = language === 'en';
  const t = (ru: string, en: string) => (isEnglish ? en : ru);

  useEffect(() => {
    let mounted = true;
    const loadWallet = async () => {
      setLoading(true);
      setError(null);
      try {
        const [walletRes, transactionsRes] = await Promise.all([
          api.get('/wallet/balance'),
          api.get('/wallet/transactions', { params: { limit: 20 } }),
        ]);

        if (!mounted) return;

        setWallet({
          ...walletRes.data,
          balance: Number(walletRes.data.balance ?? 0),
          frozen_balance: Number(walletRes.data.frozen_balance ?? 0),
        });
        setTransactions(
          (transactionsRes.data.transactions || []).map((item: WalletTransaction) => ({
            ...item,
            amount: Number(item.amount ?? 0),
          }))
        );
      } catch (err) {
        console.error('Failed to load wallet', err);
        if (mounted) {
          setError(t('Не удалось загрузить данные кошелька', 'Failed to load wallet data'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadWallet();
    return () => {
      mounted = false;
    };
  }, []);

  const packages = [
    { id: 1, poins: 100, price: 499, discount: null },
    { id: 2, poins: 250, price: 1099, discount: '10%' },
    { id: 3, poins: 500, price: 1999, discount: '15%' },
    { id: 4, poins: 1000, price: 3499, discount: '20%' },
  ];

  const formatPoints = (value?: number) =>
    typeof value === 'number' ? `${value.toLocaleString(isEnglish ? 'en-US' : 'ru-RU')} pts` : '—';

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString(isEnglish ? 'en-US' : 'ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="wallet-page">
      <Navigation />

      <main className="wallet-main">
    <div className="container">
          {/* Balance Card */}
          <section className="balance-section">
            <div className="balance-card">
              <div className="balance-label">{t('Ваш баланс', 'Your balance')}</div>
              <div className="balance-value">
                {loading ? '—' : formatPoints(wallet?.balance)}
              </div>
              <div className="balance-info">
                {loading
                  ? t('Загрузка...', 'Loading...')
                  : t('из них заморожено', 'frozen') + ` ${formatPoints(wallet?.frozen_balance)}`}
              </div>
              {error && <div className="balance-warning">{error}</div>}
            </div>
          </section>

          {/* Buy Points */}
          <section className="buy-points-section">
            <h2>{t('Пополнить баланс', 'Top up balance')}</h2>
            <div className="packages-grid">
              {packages.map((pkg) => (
                <div key={pkg.id} className="package-card">
                  {pkg.discount && (
                    <div className="package-discount">{pkg.discount}</div>
                  )}
                  <div className="package-content">
                    <div className="package-points">{pkg.poins}</div>
                    <div className="package-label">{t('поинтов', 'points')}</div>
                    <div className="package-price">₽{pkg.price}</div>
                    <button
                      className="btn-buy"
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowPaymentModal(true);
                      }}
                    >
                      {t('Купить', 'Buy')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Transaction History */}
          <section className="transactions-section">
            <h2>{t('История операций', 'Transaction history')}</h2>
            {loading ? (
              <div className="empty-state">{t('Загружаем операции…', 'Loading transactions…')}</div>
            ) : error ? (
              <div className="empty-state">{error}</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">{t('Пока нет операций', 'No transactions yet')}</div>
            ) : (
              <div className="transactions-list">
                {transactions.map((trans) => {
                  const type = trans.transaction_type?.toUpperCase() || '';
                  const incoming = incomingTypes.includes(type);
                  return (
                    <div key={trans.id} className="transaction-item">
                      <div className={`transaction-icon ${incoming ? 'incoming' : 'outgoing'}`}>
                        {renderIcon(incoming ? 'arrow-down' : 'arrow-up', 18)}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">
                          {trans.description || t('Операция кошелька', 'Wallet transaction')}
                        </div>
                        <div className="transaction-date">{formatDate(trans.created_at)}</div>
                      </div>
                      <div className={`transaction-amount ${incoming ? 'purchase' : 'spent'}`}>
                        {incoming ? '+' : '−'}
                        {Math.abs(trans.amount).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('Подтвердить покупку', 'Confirm purchase')}</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>
                {t('Вы покупаете', 'You are buying')} <strong>{selectedPackage.poins} {t('поинтов', 'points')}</strong>{' '}
                {t('за', 'for')} <strong>₽{selectedPackage.price}</strong>
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPaymentModal(false)}>
                {t('Отменить', 'Cancel')}
              </button>
              <button className="btn-confirm">{t('Подтвердить оплату', 'Confirm')}</button>
            </div>
          </div>
      </div>
      )}
    </div>
  );
};

export default WalletPage;
