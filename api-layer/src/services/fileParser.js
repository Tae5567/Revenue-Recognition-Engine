const { parse } = require('csv-parse/sync');

const REQUIRED_COLUMNS = ['contract_id', 'customer_id', 'transaction_date', 'amount'];

function parseTransactionCSV(buffer) {
  let rows;
  try {
    rows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,
    });
  } catch (err) {
    throw new Error('CSV parse error: ' + err.message);
  }

  if (!rows || rows.length === 0) {
    throw new Error('CSV file is empty or has no data rows');
  }

  const headers = Object.keys(rows[0]);
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      throw new Error(
        `Missing required column: "${col}". Required columns: ${REQUIRED_COLUMNS.join(', ')}`
      );
    }
  }

  const transactions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;

    for (const col of REQUIRED_COLUMNS) {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push({ row: rowNum, message: `Missing required field: ${col}` });
        return;
      }
    }

    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push({ row: rowNum, message: `Invalid amount: "${row.amount}"` });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(String(row.transaction_date).trim())) {
      errors.push({
        row: rowNum,
        message: `Invalid date: "${row.transaction_date}" — use YYYY-MM-DD`,
      });
      return;
    }

    const usageQty = row.usage_quantity ? parseFloat(row.usage_quantity) : null;

    transactions.push({
      contract_id: String(row.contract_id).trim(),
      customer_id: String(row.customer_id).trim(),
      transaction_date: String(row.transaction_date).trim(),
      amount,
      usage_quantity: usageQty !== null && !isNaN(usageQty) ? usageQty : null,
      usage_unit: row.usage_unit ? String(row.usage_unit).trim() : null,
      transaction_type: row.transaction_type ? String(row.transaction_type).trim() : 'invoice',
      description: row.description ? String(row.description).trim() : null,
      raw_data: row,
    });
  });

  return {
    transactions,
    errors,
    total_rows: rows.length,
    valid_rows: transactions.length,
  };
}

function parseTransactionJSON(buffer) {
  let rows;
  try {
    const parsed = JSON.parse(buffer.toString('utf-8'));
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of transaction objects');
    }
    rows = parsed;
  } catch (err) {
    throw new Error('JSON parse error: ' + err.message);
  }

  const transactions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    for (const col of REQUIRED_COLUMNS) {
      if (!row[col]) {
        errors.push({ row: rowNum, message: `Missing required field: ${col}` });
        return;
      }
    }

    const amount = parseFloat(String(row.amount));
    if (isNaN(amount) || amount <= 0) {
      errors.push({ row: rowNum, message: `Invalid amount: ${row.amount}` });
      return;
    }

    transactions.push({
      contract_id: String(row.contract_id).trim(),
      customer_id: String(row.customer_id).trim(),
      transaction_date: String(row.transaction_date).trim(),
      amount,
      usage_quantity: row.usage_quantity ? parseFloat(String(row.usage_quantity)) : null,
      usage_unit: row.usage_unit ? String(row.usage_unit).trim() : null,
      transaction_type: row.transaction_type ? String(row.transaction_type).trim() : 'invoice',
      description: row.description ? String(row.description).trim() : null,
      raw_data: row,
    });
  });

  return {
    transactions,
    errors,
    total_rows: rows.length,
    valid_rows: transactions.length,
  };
}

function parseTransactionFile(buffer, mimetype, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();
  if (ext === 'json' || mimetype === 'application/json') {
    return parseTransactionJSON(buffer);
  }
  return parseTransactionCSV(buffer);
}

module.exports = { parseTransactionCSV, parseTransactionJSON, parseTransactionFile };