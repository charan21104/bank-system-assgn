const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

const dbPath = path.join(__dirname, 'lending_system.db');
let db = null;

const initializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });

        app.listen(3000, () => {
            console.log('Server started at http://localhost:3000');
        });

        await db.run(`CREATE TABLE IF NOT EXISTS Customers (customer_id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await db.run(`CREATE TABLE IF NOT EXISTS Loans (loan_id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, principal_amount DECIMAL(10, 2) NOT NULL, total_amount DECIMAL(10, 2) NOT NULL, interest_rate DECIMAL(5, 2) NOT NULL, loan_period_years INTEGER NOT NULL, monthly_emi DECIMAL(10, 2) NOT NULL, status TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES Customers (customer_id))`);
        await db.run(`CREATE TABLE IF NOT EXISTS Payments (payment_id TEXT PRIMARY KEY, loan_id TEXT NOT NULL, amount DECIMAL(10, 2) NOT NULL, payment_type TEXT NOT NULL, payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (loan_id) REFERENCES Loans (loan_id))`);
        
        const customerCheck = await db.get(`SELECT * FROM Customers WHERE customer_id = 'cust_101'`);
        if (!customerCheck) {
            await db.run(`INSERT INTO Customers (customer_id, name) VALUES ('cust_101', 'John Doe')`);
            await db.run(`INSERT INTO Customers (customer_id, name) VALUES ('cust_102', 'Jane Smith')`);
            console.log("Sample customers added.");
        }

    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();


app.get('/api/v1/customers/:customer_id/overview', async (req, res) => {
    const { customer_id } = req.params;

    
    const customer = await db.get(`SELECT * FROM Customers WHERE customer_id = ?`, [customer_id]);
    if (!customer) {
       
        return res.status(404).json({ error: "Customer not found." });
    }


    const loans = await db.all(`SELECT * FROM Loans WHERE customer_id = ?`, [customer_id]);
    
    if (loans.length === 0) {
        return res.status(200).json({
            customer_id: customer_id,
            total_loans: 0,
            loans: []
        });
    }
    
    const loanDetails = [];
    for (const loan of loans) {
        const paymentSum = await db.get(`SELECT SUM(amount) as totalPaid FROM Payments WHERE loan_id = ?`, [loan.loan_id]);
        const amountPaid = paymentSum.totalPaid || 0;
        const balanceAmount = loan.total_amount - amountPaid;
        const emisLeft = loan.status === 'PAID_OFF' ? 0 : Math.ceil(balanceAmount / loan.monthly_emi);

        loanDetails.push({
            loan_id: loan.loan_id,
            principal: loan.principal_amount.toFixed(2),
            total_amount: loan.total_amount.toFixed(2),
            total_interest: (loan.total_amount - loan.principal_amount).toFixed(2),
            emi_amount: loan.monthly_emi.toFixed(2),
            amount_paid: amountPaid.toFixed(2),
            emis_left: emisLeft
        });
    }

    res.status(200).json({
        customer_id: customer_id,
        total_loans: loans.length,
        loans: loanDetails
    });
});


app.post('/api/v1/loans', async (req, res) => {
    const { customer_id, loan_amount, loan_period_years, interest_rate_yearly } = req.body;
    if (!customer_id || !loan_amount || !loan_period_years || !interest_rate_yearly) { return res.status(400).json({ error: "Missing required fields." }); }
    const customer = await db.get(`SELECT * FROM Customers WHERE customer_id = ?`, [customer_id]);
    if (!customer) { return res.status(404).json({ error: "Customer not found." });}
    const P = parseFloat(loan_amount), N = parseInt(loan_period_years), R = parseFloat(interest_rate_yearly);
    const totalInterest = P * N * (R / 100), totalAmountPayable = P + totalInterest, monthlyEmi = totalAmountPayable / (N * 12);
    const loan_id = uuidv4();
    const sql = `INSERT INTO Loans (loan_id, customer_id, principal_amount, total_amount, interest_rate, loan_period_years, monthly_emi, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await db.run(sql, [loan_id, customer_id, P, totalAmountPayable, R, N, monthlyEmi.toFixed(2), 'ACTIVE']);
    res.status(201).json({ loan_id, customer_id, total_amount_payable: totalAmountPayable.toFixed(2), monthly_emi: monthlyEmi.toFixed(2) });
});

app.post('/api/v1/loans/:loan_id/payments', async (req, res) => {
    const { loan_id } = req.params;
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) { return res.status(400).json({ error: "Invalid payment amount." }); }
    const loan = await db.get(`SELECT * FROM Loans WHERE loan_id = ?`, [loan_id]);
    if (!loan) { return res.status(404).json({ error: "Loan not found." }); }
    if (loan.status === 'PAID_OFF') { return res.status(400).json({ error: "This loan is already paid off." }); }
    const paymentSum = await db.get(`SELECT SUM(amount) as totalPaid FROM Payments WHERE loan_id = ?`, [loan_id]);
    const totalPaid = paymentSum.totalPaid || 0, remainingBalanceBefore = loan.total_amount - totalPaid;
    if (amount > remainingBalanceBefore) { return res.status(400).json({ error: "Payment amount exceeds remaining balance." }); }
    const payment_id = uuidv4();
    await db.run('INSERT INTO Payments (payment_id, loan_id, amount, payment_type) VALUES (?, ?, ?, ?)', [payment_id, loan_id, amount, 'LUMP_SUM']);
    const remainingBalanceAfter = remainingBalanceBefore - amount;
    if (remainingBalanceAfter <= 0) { await db.run(`UPDATE Loans SET status = 'PAID_OFF' WHERE loan_id = ?`, [loan_id]); }
    res.status(200).json({ payment_id, message: "Payment recorded successfully.", remaining_balance: remainingBalanceAfter.toFixed(2), emis_left: Math.ceil(remainingBalanceAfter / loan.monthly_emi) });
});

app.get('/api/v1/loans/:loan_id/ledger', async (req, res) => {
    const { loan_id } = req.params;
    const loan = await db.get(`SELECT * FROM Loans WHERE loan_id = ?`, [loan_id]);
    if (!loan) { return res.status(404).json({ error: "Loan not found." }); }
    const transactions = await db.all(`SELECT payment_id as transaction_id, payment_date as date, amount, payment_type as type FROM Payments WHERE loan_id = ? ORDER BY payment_date ASC`, [loan_id]);
    const amountPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
    const balanceAmount = loan.total_amount - amountPaid;
    const emisLeft = loan.status === 'PAID_OFF' ? 0 : Math.ceil(balanceAmount / loan.monthly_emi);
    res.status(200).json({ loan_id: loan.loan_id, customer_id: loan.customer_id, principal: loan.principal_amount.toFixed(2), total_amount: loan.total_amount.toFixed(2), monthly_emi: loan.monthly_emi.toFixed(2), amount_paid: amountPaid.toFixed(2), balance_amount: balanceAmount.toFixed(2), emis_left: emisLeft, transactions });
});

module.exports = app;
