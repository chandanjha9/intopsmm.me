const keyId = 'rzp_live_TTCkBabLqlWhiv';
const keySecret = 'LY15NgFGx5PfE0f9MV5epD7u';
const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');

async function findVPA() {
  const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
    body: JSON.stringify({ amount: 100, currency: 'INR', receipt: 'vpa_test3' })
  });
  const order = await orderRes.json();
  console.log('Order ID:', order.id);

  const res = await fetch(`https://api.razorpay.com/v1/preferences?key_id=${keyId}&order_id=${order.id}`);
  const data = await res.json();
  
  // Print the full structure
  console.log('\nTop-level keys:', Object.keys(data));
  
  if (data.methods) {
    console.log('\nMethods keys:', Object.keys(data.methods));
    if (data.methods.upi) {
      console.log('\nUPI:', JSON.stringify(data.methods.upi, null, 2));
    }
  }
  
  if (data.merchant) {
    console.log('\nMerchant:', JSON.stringify(data.merchant, null, 2));
  }

  // Print full JSON (limited)
  const fullStr = JSON.stringify(data);
  const vpas = fullStr.match(/[a-zA-Z0-9._-]+@[a-z]+/g);
  if (vpas) console.log('\nAll VPA patterns:', [...new Set(vpas)]);
  
  // Print the full data to find VPA
  console.log('\nFull data (first 5000 chars):', fullStr.substring(0, 5000));
}

findVPA();
