// Check the network calls of Razorpay payment link page
const plinkId = 'plink_TTEQydHpaQThjG';

async function inspectPaymentLinkApi() {
  const url = `https://api.razorpay.com/v1/payment_links/${plinkId}`;
  const keyId = 'rzp_live_TTCkBabLqlWhiv';
  const keySecret = 'LY15NgFGx5PfE0f9MV5epD7u';
  const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');

  // Let's create an order & payment link and inspect what Razorpay returns
  const plinkRes = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
    body: JSON.stringify({
      amount: 100,
      currency: 'INR',
      accept_partial: false,
      description: 'GrowMeSMM Wallet Top-Up 1 INR',
      customer: { name: 'CHANDAN KUMAR JHA', email: 'user@growmesmm.in' },
      notify: { sms: false, email: false },
      reminder_enable: false,
      upi_link: true,
      expire_by: Math.floor(Date.now() / 1000) + 960
    })
  });
  const plink = await plinkRes.json();
  console.log('plink keys:', Object.keys(plink));
  console.log('plink:', JSON.stringify(plink, null, 2));
  
  // Also let's inspect the HTML of the payment link page to see where the QR image/data comes from
  const pageRes = await fetch(plink.short_url, { redirect: 'follow' });
  const html = await pageRes.text();
  
  // Find all URLs in html containing "qr" or "data:image" or "svg"
  const qrMatches = html.match(/(https:\/\/[^"'\s<>]+(qr|svg|png|jpg)[^"'\s<>]*)/gi);
  console.log('Image URLs:', qrMatches);

  // Check if Razorpay loads an iframe or checkout script
  const scripts = html.match(/src="([^"]+)"/g);
  console.log('Script sources in payment link:', scripts);
}

inspectPaymentLinkApi();
