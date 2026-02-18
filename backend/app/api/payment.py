from fastapi import APIRouter, HTTPException
import stripe
from app.core.config import settings
from app.models.schemas import PaymentRequest, PaymentResponse
from app.services.database import db

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/create-checkout", response_model=PaymentResponse)
async def create_checkout_session(request: PaymentRequest):
    """
    Create Stripe checkout session for €7 payment
    """
    
    try:
        # Verify application exists
        application = await db.get_application(request.application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': 'Uni-Assist Full Report',
                        'description': 'Complete document analysis with fixing guide and real examples',
                    },
                    'unit_amount': 700,  # €7.00 in cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/results/{request.application_id}?payment=success",
            cancel_url=f"{settings.FRONTEND_URL}/results/{request.application_id}?payment=cancelled",
            customer_email=request.email,
            metadata={
                'application_id': request.application_id,
            },
        )
        
        return PaymentResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except Exception as e:
        print(f"Payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))