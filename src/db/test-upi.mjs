const keyId = 'rzp_live_TTCkBabLqlWhiv';
const keySecret = 'LY15NgFGx5PfE0f9MV5epD7u';
const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');

async function fetchLinkDetails() {
  // Fetch the short_url page to find the UPI deep link
  console.log('--- Fetching short_url page ---');
  const pageRes = await fetch('https://rzp.io/rzp/7yB2hCi', { redirect: 'follow' });
  console.log('Final URL:', pageRes.url);
  const html = await pageRes.text();
  
  // Look for upi:// intent in the page
  const upiMatch = html.match(/upi:\/\/pay[^"']*/);
  if (upiMatch) {
    console.log('\nUPI Intent found:', upiMatch[0]);
  } else {
    console.log('\nNo UPI intent found in page HTML.');
    // Print first 2000 chars
    console.log('\nPage preview (first 2000 chars):', html.substring(0, 2000));
  }
}

fetchLinkDetails();
