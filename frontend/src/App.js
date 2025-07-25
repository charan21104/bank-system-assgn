import React, { useState, useEffect } from 'react';
import './App.css'; 

const API_BASE_URL = 'http://localhost:3000/api/v1';

const Spinner = () => (
    <div className="spinner-container">
        <div className="spinner"></div>
    </div>
);

const Alert = ({ message, type = 'error' }) => {
    if (!message) return null;
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    return (
        <div className={`alert ${alertClass}`} role="alert">
            <span>{message}</span>
        </div>
    );
};

const Button = ({ children, onClick, className = '', type = 'button', disabled = false }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn ${className}`}
    >
        {children}
    </button>
);

const Input = ({ ...props }) => (
    <input
        {...props}
        className="input-field"
    />
);

const CreateLoanForm = ({ customerId, onLoanCreated }) => {
    const [loanAmount, setLoanAmount] = useState('');
    const [loanPeriod, setLoanPeriod] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_BASE_URL}/loans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    loan_amount: parseFloat(loanAmount),
                    loan_period_years: parseInt(loanPeriod),
                    interest_rate_yearly: parseFloat(interestRate),
                }),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to create loan.'); }
            setSuccess(`Loan created successfully! Loan ID: ${data.loan_id}`);
            setLoanAmount(''); setLoanPeriod(''); setInterestRate('');
            if (onLoanCreated) { onLoanCreated(); }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h3 className="card-title">Create New Loan</h3>
            <form onSubmit={handleSubmit} className="form-container">
                <div className="form-group">
                    <label htmlFor="loanAmount" className="form-label">Loan Amount ($)</label>
                    <Input id="loanAmount" type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="e.g., 5000" required />
                </div>
                <div className="form-group">
                    <label htmlFor="loanPeriod" className="form-label">Loan Period (Years)</label>
                    <Input id="loanPeriod" type="number" value={loanPeriod} onChange={(e) => setLoanPeriod(e.target.value)} placeholder="e.g., 2" required />
                </div>
                <div className="form-group">
                    <label htmlFor="interestRate" className="form-label">Yearly Interest Rate (%)</label>
                    <Input id="interestRate" type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="e.g., 5.5" required />
                </div>
                <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Loan'}</Button>
            </form>
            <Alert message={error} type="error" />
            <Alert message={success} type="success" />
        </div>
    );
};

const MakePaymentForm = ({ loan, onPaymentMade }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (loan && loan.monthly_emi) { setAmount(loan.monthly_emi); }
    }, [loan]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`${API_BASE_URL}/loans/${loan.loan_id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(amount) }),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to make payment.'); }
            setSuccess(data.message);
            setAmount('');
            if (onPaymentMade) { onPaymentMade(); }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h3 className="card-title">Make a Payment</h3>
            <form onSubmit={handleSubmit} className="form-container">
                <div className="form-group">
                    <label htmlFor="paymentAmount" className="form-label">Payment Amount ($)</label>
                    <Input id="paymentAmount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter payment amount" required />
                </div>
                <Button type="submit" disabled={loading || loan.status === 'PAID_OFF'}>{loan.status === 'PAID_OFF' ? 'Loan Paid Off' : (loading ? 'Processing...' : 'Submit Payment')}</Button>
            </form>
            <Alert message={error} type="error" />
            <Alert message={success} type="success" />
        </div>
    );
};

const LoanLedger = ({ loanId, onBack }) => {
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLedger = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/loans/${loanId}/ledger`);
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to fetch loan ledger.'); }
            setLedger(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLedger(); }, [loanId]);

    if (loading) return <Spinner />;
    if (error) return <Alert message={error} />;
    if (!ledger) return null;

    return (
        <div>
            <Button onClick={onBack}>&larr; Back to Overview</Button>
            <div className="card" style={{marginTop: '1rem'}}>
                <h2 className="card-title">Loan Ledger</h2>
                <p><span className="loan-card-label">Loan ID:</span> {ledger.loan_id}</p>
                <p style={{marginBottom: '1rem'}}><span className="loan-card-label">Customer ID:</span> {ledger.customer_id}</p>
                <div className="ledger-details-grid">
                    <div className="ledger-detail-item bg-gray-light"><p>Principal</p><p>${ledger.principal}</p></div>
                    <div className="ledger-detail-item bg-blue-light"><p>Total Payable</p><p>${ledger.total_amount}</p></div>
                    <div className="ledger-detail-item bg-green-light"><p>Amount Paid</p><p>${ledger.amount_paid}</p></div>
                    <div className="ledger-detail-item bg-red-light"><p>Balance</p><p>${ledger.balance_amount}</p></div>
                </div>
                <h3 className="card-title" style={{marginTop: '1.5rem'}}>Transactions</h3>
                <div>
                    <table className="transactions-table">
                        <thead><tr><th>Date</th><th>Type</th><th className="text-right">Amount</th></tr></thead>
                        <tbody>
                            {ledger.transactions.length > 0 ? (ledger.transactions.map(tx => (<tr key={tx.transaction_id}><td>{new Date(tx.date).toLocaleDateString()}</td><td>{tx.type}</td><td className="text-right">${parseFloat(tx.amount).toFixed(2)}</td></tr>))) : (<tr><td colSpan="3" className="text-center">No transactions yet.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
            <MakePaymentForm loan={ledger} onPaymentMade={fetchLedger} />
        </div>
    );
};

const CustomerOverview = ({ customerData, onSelectLoan, onLoanCreated }) => {
    return (
        <div>
            <div className="card">
                <h2 className="card-title">Customer Overview</h2>
                <p style={{color: '#4a5568', marginBottom: '1rem'}}>Customer ID: {customerData.customer_id}</p>
                <div className="overview-grid">
                    {customerData.loans.length > 0 ? (
                        customerData.loans.map(loan => (
                            <div key={loan.loan_id} className="loan-card">
                                <p style={{fontWeight: 'bold'}}>Loan ID: <span style={{fontWeight: 'normal', fontSize: '0.875rem'}}>{loan.loan_id}</span></p>
                                <div className="loan-card-row"><span className="loan-card-label">Principal:</span><span className="loan-card-value">${loan.principal}</span></div>
                                <div className="loan-card-row"><span className="loan-card-label">Amount Paid:</span><span className="loan-card-value">${loan.amount_paid}</span></div>
                                <div className="loan-card-row"><span className="loan-card-label">EMIs Left:</span><span className="loan-card-value">{loan.emis_left}</span></div>
                                <Button onClick={() => onSelectLoan(loan.loan_id)} style={{width: '100%', marginTop: '1rem'}}>View Ledger</Button>
                            </div>
                        ))
                    ) : (
                        <p style={{color: '#4a5568'}}>This customer has no active loans. You can create one below.</p>
                    )}
                </div>
            </div>
            <CreateLoanForm customerId={customerData.customer_id} onLoanCreated={onLoanCreated} />
        </div>
    );
};

export default function App() {
    const [customerId, setCustomerId] = useState('');
    const [customerData, setCustomerData] = useState(null);
    const [selectedLoanId, setSelectedLoanId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFetchOverview = async () => {
        if (!customerId) { setError('Please enter a Customer ID.'); return; }
        setLoading(true);
        setError('');
        setCustomerData(null);
        setSelectedLoanId(null);

        try {
            const response = await fetch(`${API_BASE_URL}/customers/${customerId}/overview`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `An error occurred.`);
            }
            setCustomerData(data);
        } catch (err) {
            setError(err.message);
            setCustomerData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectLoan = (loanId) => { setSelectedLoanId(loanId); };
    const handleBackToOverview = () => { setSelectedLoanId(null); handleFetchOverview(); };

    const renderContent = () => {
        if (loading) { return <Spinner />; }
        if (selectedLoanId) { return <LoanLedger loanId={selectedLoanId} onBack={handleBackToOverview} />; }
        if (customerData) { return <CustomerOverview customerData={customerData} onSelectLoan={handleSelectLoan} onLoanCreated={handleFetchOverview} />; }
        return null;
    };

    return (
        <div>
            <header className="app-header">
                <h1 className="app-title">Bank Lending System</h1>
            </header>
            <main className="main-container">
                <div className="card">
                    <h2 className="card-title">Find Customer</h2>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <Input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Enter Customer ID (e.g., cust_101)" onKeyPress={(e) => e.key === 'Enter' && handleFetchOverview()} />
                        <Button onClick={handleFetchOverview} disabled={loading} style={{width: 'auto'}}>{loading ? 'Fetching...' : 'Get Account Overview'}</Button>
                    </div>
                </div>
                <Alert message={error} />
                {renderContent()}
            </main>
        </div>
    );
}
