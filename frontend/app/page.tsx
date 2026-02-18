import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Users, Euro, TrendingDown } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            Will Uni-Assist Reject Your Application?
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Find out in 3 minutes - FREE. Check your documents before wasting
            €75.
          </p>

          <Link href="/check">
            <Button size="lg" className="text-lg px-8 py-6">
              Check My Documents - FREE
            </Button>
          </Link>

          <p className="text-sm text-gray-500 mt-4">
            No signup required • Results in 3 minutes • Your data is never
            stored
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-16">
          <Card className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold">1,247</div>
            <div className="text-sm text-gray-600">Students Checked</div>
          </Card>

          <Card className="p-6 text-center">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-3xl font-bold">412</div>
            <div className="text-sm text-gray-600">Rejections Prevented</div>
          </Card>

          <Card className="p-6 text-center">
            <Euro className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-bold">€30,900</div>
            <div className="text-sm text-gray-600">Saved in Fees</div>
          </Card>

          <Card className="p-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold">94%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-6">
            <div className="text-4xl mb-4">📤</div>
            <h3 className="text-xl font-semibold mb-2">1. Upload Documents</h3>
            <p className="text-gray-600">
              Upload your transcript, degree certificate, and language test
              (PDFs only)
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">2. AI Analysis</h3>
            <p className="text-gray-600">
              Our AI scans for 15+ common rejection reasons in 3 minutes
            </p>
          </Card>

          <Card className="p-6">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-semibold mb-2">3. Get Results</h3>
            <p className="text-gray-600">
              See your risk score FREE. Upgrade for fixing guide (€7)
            </p>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Students Say
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6">
              <p className="text-gray-700 italic mb-4">
                "Found 3 critical issues I never noticed. Fixed them in 5 days,
                got accepted to TUM. Best €7 ever spent."
              </p>
              <p className="font-semibold text-purple-600">
                — Aditya M., India → TU Munich
              </p>
            </Card>

            <Card className="p-6">
              <p className="text-gray-700 italic mb-4">
                "My transcript was a scanned image. This tool caught it
                immediately. Saved me €75 and 8 weeks."
              </p>
              <p className="font-semibold text-purple-600">
                — Chiamaka O., Nigeria → RWTH Aachen
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">
          Ready to Check Your Application?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Takes 3 minutes. Could save you €75 and 2 months.
        </p>
        <Link href="/check">
          <Button size="lg" className="text-lg px-8 py-6">
            Start Free Check Now
          </Button>
        </Link>
      </section>
    </div>
  );
}
