const mongoose = require('mongoose')
const connect = mongoose.connect('mongodb://127.0.0.1:27017/moneyTracker')

connect.then(() => {
    console.log("Connected To Database Successfully")
})
    .catch(() => {
        console.log("Could Not Connect to Database")
    })

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})
const User = mongoose.model('users', userSchema)

const incomeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    source: {
        type: String,
        required: true
    },
    frequency: {
        type: String,
        required: true
    }
})
const Income = mongoose.model('income', incomeSchema)

const expenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        required: true
    }
})
const Expense = mongoose.model('expense', expenseSchema)

const budgetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    limit: {
        type: Number,
        required: true
    },
    bdate: {
        type: Date,
        required: true
    },
    bcategory: {
        type: String,
        required: true
    }
})
const Budget = mongoose.model('budget', budgetSchema)

const savingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    amount: {
        type: Number,
        required: true
    },
    sdate: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true
    }
})
const Saving = mongoose.model('saving', savingSchema)

module.exports = { User, Income, Expense, Budget, Saving }