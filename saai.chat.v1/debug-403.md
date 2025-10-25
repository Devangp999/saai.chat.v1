# Debug 403 Error

## Check these in n8n:

1. **Open your Chat webhook in n8n**
2. **Go to Executions tab**
3. **Find the failed execution**
4. **Check which node failed**

## Common causes:

### A. JWT Validation Node Failing
- Check if you have a JWT validation node
- Verify the secret key matches between OAuth and Chat workflows
- Check if JWT is expired (should auto-refresh now)

### B. Whitelist Check Failing
- If you added email whitelist, check if your email is in the list
- Verify the Supabase query is correct

### C. Missing Fields
- Check if the webhook expects specific fields you're not sending
- Look at the request body in n8n execution

## What to send me:
- Screenshot of the failed n8n execution
- Error message from the failing node
- The request body that was sent
