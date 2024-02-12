//Importing Modules

const express = require('express')
const path = require('path')
const bcrypt = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const jsdom = require('jsdom')
const moment = require('moment')
const JWT_SECRET = 'Secret@pass$'
const { JSDOM } = jsdom
const { User, Income, Expense, Budget, Saving } = require('./db')
const fetchuser = require('./middleware/fetchuser')

//Setting Up Express And Adding Middleware Functions

const app = express()
app.use('/static', express.static('static'))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(
    session({
        secret: "Session@eNter",
        resave: false,
        saveUninitialized: true,
    })
);

//Defining Route Handler For GET Requests

app.get('/', async function (req, res) {
    getToken = req.session.token
    let email = req.session.useremail
    if (getToken !== undefined) {
        let user = await User.findOne({ email })
        req.session.userID = user.id
        const dom = await JSDOM.fromFile('./index.html')
        const budgetList = dom.window.document.getElementById('budgetList')
        const savingList = dom.window.document.getElementById('savingList')
        const exceedList = dom.window.document.getElementById('exceed')
        const iexceedList = dom.window.document.getElementById('incomeExceed')
        //For Setting Budget Category-Wise
        await Budget.aggregate([
            {
                $group: {
                    _id: {
                        userID: '$user',
                        category: '$bcategory',
                        month: { $month: '$bdate' },
                        year: { $year: '$bdate' }
                    },
                    totalAmount: { $sum: '$limit' }
                }
            }
        ]).then((result) => {
            req.session.budget = result
        })
        //For Setting Savings Description-Wise
        await Saving.aggregate([
            {
                $group: {
                    _id: {
                        userID: '$user',
                        month: { $month: '$sdate' },
                        year: { $year: '$sdate' },
                        description: '$description'
                    },
                    totalAmount: { $sum: '$amount' },
                }
            }
        ]).then((result) => {
            req.session.saving = result
        })
        //For Setting Expenses Category-Wise
        await Expense.aggregate([
            {
                $group: {
                    _id: {
                        userID: '$user',
                        category: '$category',
                        month: { $month: '$date' },
                        year: { $year: '$date' }
                    },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]).then((result) => {
            result.forEach((r) => {
                if (r._id.userID.toString() === req.session.userID) {
                    req.session.budget.forEach((b) => {
                        //Displaying Only Current Month's Details
                        if (r._id.category === b._id.category && r._id.month === b._id.month && r._id.year === b._id.year && moment().month() + 1 === r._id.month && moment().year() === r._id.year) {
                            if (r.totalAmount > b.totalAmount) {
                                let expenseList = dom.window.document.createElement('div')
                                expenseList.innerHTML = `Expense Exceeded In The Category: ${r._id.category}<br>Total Expenses This Month: Rs. ${r.totalAmount}&nbsp;&nbsp;&nbsp;Budget: Rs. ${b.totalAmount}`
                                exceedList.appendChild(expenseList)
                            }
                        }
                    })
                }
            })
        })
        //For Setting Expenses Month-Wise
        await Expense.aggregate([
            {
                $group: {
                    _id: {
                        userID: '$user',
                        month: { $month: '$date' },
                        year: { $year: '$date' }
                    },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]).then((result) => {
            req.session.expenseDated = result
        })
        //For Setting Savings Month-Wise
        await Saving.aggregate([
            {
                $group: {
                    _id: {
                        userID: '$user',
                        month: { $month: '$sdate' },
                        year: { $year: '$sdate' },
                    },
                    totalAmount: { $sum: '$amount' },
                }
            }
        ]).then((result) => {
            req.session.saveDated = result
        })
        //For Setting Income Month-Wise
        await Income.aggregate([
            {
                $group: {
                    _id: {
                        userID: '$user',
                        month: { $month: '$date' },
                        year: { $year: '$date' }
                    },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]).then((result) => {
            result.forEach((i) => {
                if (i._id.userID.toString() === req.session.userID) {
                    req.session.expenseDated.forEach((e) => {
                        //Displaying Only Current Month's Details
                        if (i._id.month === e._id.month && i._id.year === e._id.year && moment().month() + 1 === i._id.month && moment().year() === i._id.year && e._id.userID.toString() === req.session.userID) {
                            req.session.saveDated.forEach((s) => {
                                if (i.totalAmount - e.totalAmount <= s.totalAmount && moment().month() + 1 === s._id.month && moment().year() === s._id.year && s._id.userID.toString() === req.session.userID) {
                                    let expenseList = dom.window.document.createElement('div')
                                    expenseList.innerHTML = `Your Savings Are Depreciated, Remaining Balance: Rs. ${i.totalAmount - e.totalAmount}<br>Total Income This Month: Rs. ${i.totalAmount}&nbsp;&nbsp;&nbsp;Total Expenses This Month: Rs. ${e.totalAmount}<br>`
                                    iexceedList.appendChild(expenseList)
                                }
                                else if (i.totalAmount - e.totalAmount <= s.totalAmount + 0.1 * i.totalAmount && moment().month() + 1 === s._id.month && moment().year() === s._id.year && s._id.userID.toString() === req.session.userID) {
                                    let expenseList = dom.window.document.createElement('div')
                                    expenseList.innerHTML = `Your Savings Are About To Depreciate, Remaining Balance: Rs. ${i.totalAmount - e.totalAmount}<br>Total Income This Month: Rs. ${i.totalAmount}&nbsp;&nbsp;&nbsp;Total Expenses This Month: Rs. ${e.totalAmount}<br>`
                                    iexceedList.appendChild(expenseList)
                                }
                            })
                        }
                    })
                }
            })
        })
        req.session.budget.forEach((b) => {
            if (b._id.userID.toString() === req.session.userID) {
                //Displaying Only Current Month's Budget
                if (moment().month() + 1 === b._id.month && moment().year() === b._id.year) {
                    let currentList = dom.window.document.createElement('div')
                    currentList.innerHTML = `Limit: Rs. ${b.totalAmount}<br>Category: ${b._id.category}`
                    budgetList.appendChild(currentList)
                }
            }
        })
        req.session.saving.forEach((s) => {
            if (s._id.userID.toString() === req.session.userID) {
                //Displaying Only Current Month's Saving Goals
                if (moment().month() + 1 === s._id.month && moment().year() === s._id.year) {
                    let currentList = dom.window.document.createElement('div')
                    currentList.innerHTML = `Saving Goal: Rs. ${s.totalAmount}<br>Description: ${s._id.description}`
                    savingList.appendChild(currentList)
                }
            }
        })
        const html = dom.serialize()
        res.send(html)
    }
    else {
        res.sendFile(__dirname + '/login.html')
    }
})

app.get('/about', async function (req, res) {
    try {
        //For Displaying Username And Email
        const dom = await JSDOM.fromFile('./about.html')
        const aboutDiv = dom.window.document.getElementById('aboutSection')
        let aboutName = dom.window.document.createElement('div')
        let aboutEmail = dom.window.document.createElement('div')
        aboutName.textContent = `UserName: ${req.session.username}`
        aboutEmail.textContent = `Email: ${req.session.useremail}`
        aboutDiv.appendChild(aboutName)
        aboutDiv.appendChild(aboutEmail)
        const html = dom.serialize()
        res.send(html)
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

app.get('/signup', function (req, res) {
    res.sendFile(__dirname + '/signup.html')
})

app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/login.html')
})

app.get('/addincome', function (req, res) {
    res.sendFile(__dirname + '/addincome.html')
})

app.get('/addexpense', function (req, res) {
    res.sendFile(__dirname + '/addexpense.html')
})

app.get('/addbudget', function (req, res) {
    res.sendFile(__dirname + '/addbudget.html')
})

app.get('/addsavings', function (req, res) {
    res.sendFile(__dirname + '/addsavings.html')
})

app.get('/logout', function (req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.sendFile(__dirname + '/login.html')
    })
})

app.get('/viewincome', fetchuser, async (req, res) => {
    try {
        const dom = await JSDOM.fromFile('./viewincome.html')
        const incomeList = dom.window.document.getElementById('income-list')
        let currentList = dom.window.document.createElement('ul')
        const income = await Income.find({ user: req.user.id })
        income.forEach((record) => {
            const item1 = dom.window.document.createElement('li')
            item1.textContent = `Amount: Rs. ${record.amount}`
            currentList.appendChild(item1)
            const item2 = dom.window.document.createElement('li')
            item2.textContent = `Date: ${record.date.toDateString()}`
            currentList.appendChild(item2)
            const item3 = dom.window.document.createElement('li')
            item3.textContent = `Source: ${record.source}`
            currentList.appendChild(item3)
            const item4 = dom.window.document.createElement('li')
            item4.textContent = `Frequency Of Payment: ${record.frequency}`
            currentList.appendChild(item4)
            incomeList.appendChild(currentList)
            currentList = dom.window.document.createElement('ul')
        })
        const html = dom.serialize()
        res.send(html)
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

app.get('/viewexpense', fetchuser, async (req, res) => {
    try {
        const dom = await JSDOM.fromFile('./viewexpense.html')
        const expenseList = dom.window.document.getElementById('expense-list')
        let currentList = dom.window.document.createElement('ul')
        const expense = await Expense.find({ user: req.user.id })
        expense.forEach((record) => {
            const item1 = dom.window.document.createElement('li')
            item1.textContent = `Amount: Rs. ${record.amount}`
            currentList.appendChild(item1)
            const item2 = dom.window.document.createElement('li')
            item2.textContent = `Date: ${record.date.toDateString()}`
            currentList.appendChild(item2)
            const item3 = dom.window.document.createElement('li')
            item3.textContent = `Category: ${record.category}`
            currentList.appendChild(item3)
            const item4 = dom.window.document.createElement('li')
            item4.textContent = `Mode Of Payment: ${record.mode}`
            currentList.appendChild(item4)
            expenseList.appendChild(currentList)
            currentList = dom.window.document.createElement('ul')
        })
        const html = dom.serialize()
        res.send(html)
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

//Defining Route Handler For POST Requests

app.post('/signup', [
    body('name').notEmpty().isLength({ min: 6 }),
    body('email').notEmpty().isEmail(),
    body('password').notEmpty().isLength({ min: 6 })],
    async (req, res) => {
        let success = false
        //Checking Express-Validator Errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.send('<script>alert("Provide Valid Email"); window.location.href = "/signup";</script>')
        }
        try {
            if (req.body.password === req.body.cpassword) {
                //Checking Whether User Exists Or Not
                let user = await User.findOne({ email: req.body.email });
                if (user) {
                    return res.send('<script>alert("User Exists"); window.location.href = "/signup";</script>')
                }
                //Encrypting Password
                const salt = await bcrypt.genSalt(10)
                secPass = await bcrypt.hash(req.body.password, salt)
                //Storing User Data In Database
                user = await User.create({
                    name: req.body.name,
                    email: req.body.email,
                    password: secPass
                })
                res.send('<script>alert("User Created Successfully"); window.location.href = "/login";</script>')
            }
            else {
                res.send('<script>alert("Password Does Not Match With Confirm Password"); window.location.href = "/signup";</script>')
            }
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error")
        }
    })

app.post('/login', [body('email').notEmpty().isEmail(),
body('password').notEmpty()],
    async (req, res) => {
        let success = false
        //Checking Express-Validator Errors
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.send('<script>alert("Provide Valid Details"); window.location.href = "/login";</script>')
        }
        const { email, password } = req.body
        try {
            //Comparing By Email
            let user = await User.findOne({ email })
            if (!user) {
                return res.send('<script>alert("Invalid Email Or Password"); window.location.href = "/login";</script>')
            }
            //Comparing By Password
            const passwordCompare = await bcrypt.compare(password, user.password)
            if (!passwordCompare) {
                return res.send('<script>alert("Invalid Email Or Password"); window.location.href = "/login";</script>')
            }
            //Logging In The User
            const data = {
                user: {
                    id: user.id
                }
            }
            const authToken = jwt.sign(data, JWT_SECRET)
            req.session.token = authToken
            success = true
            const about = {
                name: user.name,
                email: user.email
            }
            req.session.username = about.name
            req.session.useremail = about.email
            res.send('<script>alert("Logged In Successfully"); window.location.href = "/";</script>')
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal Server Error")
        }
    })

app.post('/addincome', fetchuser, async (req, res) => {
    try {
        const { amount, date, source, frequency } = req.body
        const income = new Income({
            amount, date, source, frequency, user: req.user.id
        })
        const savedIncome = await income.save()
        res.send('<script>alert("Details Added Successfully"); window.location.href = "/";</script>')
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

app.post('/addexpense', fetchuser, async (req, res) => {
    try {
        const { amount, date, category, mode } = req.body
        const expense = new Expense({
            amount, date, category, mode, user: req.user.id
        })
        const savedExpense = await expense.save()
        res.send('<script>alert("Details Added Successfully"); window.location.href = "/";</script>')
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

app.post('/addbudget', fetchuser, async (req, res) => {
    try {
        const { limit, bdate, bcategory } = req.body
        const budget = new Budget({
            limit, bdate, bcategory, user: req.user.id
        })
        const savedBudget = await budget.save()
        const budgetDate=new Date(bdate)
        if(budgetDate.getUTCMonth()===moment().month()&&budgetDate.getUTCFullYear()===moment().year()){
            res.send('<script>alert("Details Added Successfully"); window.location.href = "/";</script>')
        }
        else if(budgetDate.getUTCMonth()!==moment().month()||budgetDate.getUTCFullYear()!==moment().year()){
            res.send('<script>alert("Details Added Successfully But Only Current Month Details Will Be Displayed In Home Page"); window.location.href = "/";</script>')
        }
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

app.post('/addsavings', fetchuser, async (req, res) => {
    try {
        const { amount, sdate, description } = req.body
        const saving = new Saving({
            amount, sdate, description, user: req.user.id
        })
        const savedSaving = await saving.save()
        const savingDate=new Date(sdate)
        if(savingDate.getUTCMonth()===moment().month()&&savingDate.getUTCFullYear()===moment().year()){
            res.send('<script>alert("Details Added Successfully"); window.location.href = "/";</script>')
        }
        else if(savingDate.getUTCMonth()!==moment().month()||savingDate.getUTCFullYear()!==moment().year()){
            res.send('<script>alert("Details Added Successfully But Only Current Month Details Will Be Displayed In Home Page"); window.location.href = "/";</script>')
        }
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})

app.listen(500, () => {
    console.log("Started on port 500")
})