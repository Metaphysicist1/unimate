from fastapi import APIRouter, Request, HTTPException, Header
import stripe
from app.core.config import settings
from app.services.database import db

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/stripe-webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None)
):
    """
    Handle Stripe webhooks
    """
    
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET
        )
        
        # Handle checkout.session.completed
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            application_id = session['metadata']['application_id']
            
            # Mark application as paid
            await db.mark_as_paid(application_id)
            
            print(f"Payment successful for application: {application_id}")
        
        return {"status": "success"}
        
    except ValueError as e:
        print(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        print(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))