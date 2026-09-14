#  Church Finance Management System

A web-based financial management system designed to help a church record, organize, monitor, and report its financial activities in one place.

##  About the Project

The **Church Finance Management System** was built to make church financial record-keeping easier and more organized.

The system allows authorized users to record income, expenses, construction-related finances, promised money, and middle-person transactions while providing administrators with a clear overview of the church's financial position.

##  Features

###  Income & Expense Management

* Record regular income and expenses
* Record construction/building income
* Record construction expenses
* Track transactions by bank
* View financial totals and balances

###  Bank Management

The system supports the church's selected banking options, including:

* Birhan Bank
* Nigd Bank
* PT Cash

Bank balances are automatically reflected when financial transactions are recorded.

###  Promised Money

Administrators can record:

* Person making the promise
* Amount promised
* Purpose
* Date
* Payments made toward the promise
* Remaining promised amount

###  Middle-Person Money

The system also tracks money handled by a middle person, including:

* Person's name
* Amount taken
* Date
* Bank source
* Amount eventually received as PT Cash

This makes it easier to understand money that is temporarily held before being distributed.

###  User & Admin Roles

The application includes role-based access.

**Admin**

* Full access to financial records
* Manage users
* View detailed financial information
* Manage promised and middle-person records
* Backup and restore data

**Staff/User**

* Enter permitted financial records
* View their relevant records
* Download JSON backups

###  Data Backup

The application supports JSON data backup so financial records can be downloaded and kept as an independent backup.

###  Financial Dashboard

The dashboard provides an overview of:

* Total income
* Total expenses
* Net balance
* Bank balances
* Construction finances
* Other financial summaries

###  Record Management

Financial records can be deleted from the system, with changes synchronized with the application's database.

##  Technologies Used

* **HTML5**
* **CSS3**
* **JavaScript**
* **Node.js**
* **Express.js**
* **SQLite**
* **JSON**

##  Project Structure

```text
financial-project/
│
├── public/
│   └── index.html
│
├── server.js
├── db.js
├── package.json
├── package-lock.json
└── README.md
```

##  Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/kaleb33-star/financial-project.git
```

### 2. Enter the project folder

```bash
cd financial-project
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the server

```bash
npm start
```

Then open the local address shown by the server in your browser.

##  Security Note

This application manages financial information. Before using it for real church operations, make sure production authentication, database security, backups, and deployment configuration are properly secured.

Never commit passwords, API keys, database credentials, or other secrets to GitHub.

##  Deployment

The Church Finance Management System is **already deployed and running online** through EthioDeploy.

The project is connected to its GitHub repository, so updates pushed to the configured GitHub branch can be deployed to the live application through the deployment setup.

##  Developer

**Kaleb Semen Bekele**

Built as a practical software project focused on applying web development, database management, and financial information systems to a real-world Ethiopian church context.

##  License

This project is currently intended for educational and organizational use.
