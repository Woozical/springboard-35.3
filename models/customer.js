/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /***************** Static Methods *****************/

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** Filter customer by first_name and/or last_name */

  static async search(term){
    let text = 'SELECT id, first_name AS "firstName", last_name AS "lastName", phone, notes FROM customers';
    let values;
    // modify our query based on whether user searched for a full name
    const splitTerm = term.split(' ');
    if (splitTerm.length > 1){
      text += " WHERE first_name ILIKE '%' || $1 || '%' AND last_name ILIKE '%' || $2 || '%'";
      values = [splitTerm[0], splitTerm[1]];
    } else {
      text += " WHERE first_name ILIKE '%' || $1 || '%' OR last_name ILIKE '%' || $1 || '%'";
      values = [term];
    }
    const results = await db.query(text, values);
    return results.rows.map(c => new Customer(c));
  }

  /** Get top (num) customers based on reservations made */

  static async getTop(num){
    const results = await db.query(
      `SELECT customers.id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         customers.notes 
        FROM customers
        JOIN reservations ON customers.id = reservations.customer_id
        GROUP BY customers.id ORDER BY count(*)
        DESC LIMIT $1`,
      [num]
    );
    return results.rows.map(c => new Customer(c));
  }

  /***************** Instance Methods *****************/

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  get fullName(){
    return `${this.firstName} ${this.lastName}`;
  }
}

module.exports = Customer;
