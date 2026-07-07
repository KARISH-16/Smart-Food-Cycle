import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

interface DashboardMetrics {
  totalDonations: number;
  totalBeneficiaries: number;
  totalFoodQuantity: number;
  estimatedMealsServed: number;
  estimatedWasteReducedKg: number;
}

interface AiPlanResult {
  adjustedPortionPerPerson: number;
  totalAdjustedPortions: number;
  surplusOrDeficit: number;
  weatherFactor: number;
  budgetPerPerson: number;
  budgetTip: string;
  menuAlternatives: string[];
}

type AuthMode = 'login' | 'signup';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'Smart Food Cycle';

  constructor(public auth: AuthService) {}

  // ---- Dashboard metrics ----
  metrics: DashboardMetrics | null = null;
  isLoadingMetrics = false;
  metricsError = '';

  // ---- AI portion planner ----
  aiForm: {
    leftoverFood: number | null;
    peopleCount: number | null;
    weather: string;
    budget: number | null;
  } = {
    leftoverFood: null,
    peopleCount: null,
    weather: 'mild',
    budget: null
  };
  aiPlanResult: AiPlanResult | null = null;
  isLoadingAiPlan = false;
  aiPlanError = '';

  // ---- Donation dispatcher ----
  donationForm: {
    donorName: string;
    location: string;
    foodType: string;
    quantity: number | null;
  } = {
    donorName: '',
    location: '',
    foodType: '',
    quantity: null
  };
  donationStatusMessage = '';
  donationStatusIsError = false;
  isSubmittingDonation = false;

  // ---- Beneficiary enrollment ----
  beneficiaryForm: {
    beneficiaryName: string;
    needType: string;
  } = {
    beneficiaryName: '',
    needType: ''
  };
  beneficiaryStatusMessage = '';
  beneficiaryStatusIsError = false;
  isSubmittingBeneficiary = false;

  // ---- Auth modal ----
  isAuthModalOpen = false;
  authMode: AuthMode = 'login';
  authForm = {
    name: '',
    email: '',
    password: ''
  };
  authError = '';
  isAuthSubmitting = false;

  ngOnInit(): void {
    this.loadMetrics();
  }

  // ===== Metrics =====
  async loadMetrics(): Promise<void> {
    this.isLoadingMetrics = true;
    this.metricsError = '';

    try {
      const response = await fetch('/api/metrics');
      const result = await response.json();

      if (result.success) {
        this.metrics = result.metrics;
      } else {
        this.metricsError = result.message || 'Unable to load metrics.';
      }
    } catch (error) {
      this.metricsError = 'Network error while loading metrics.';
    } finally {
      this.isLoadingMetrics = false;
    }
  }

  // ===== AI planner =====
  async submitAiPlan(): Promise<void> {
    this.isLoadingAiPlan = true;
    this.aiPlanError = '';
    this.aiPlanResult = null;

    try {
      const response = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftoverFood: this.aiForm.leftoverFood,
          peopleCount: this.aiForm.peopleCount,
          weather: this.aiForm.weather,
          budget: this.aiForm.budget
        })
      });

      const result = await response.json();

      if (result.success) {
        this.aiPlanResult = result.plan;
      } else {
        this.aiPlanError = result.message || 'Unable to generate plan.';
      }
    } catch (error) {
      this.aiPlanError = 'Network error while generating plan.';
    } finally {
      this.isLoadingAiPlan = false;
    }
  }

  // ===== Donations (requires auth) =====
  async submitDonation(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }

    this.isSubmittingDonation = true;
    this.donationStatusMessage = '';
    this.donationStatusIsError = false;

    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.auth.authHeader() },
        body: JSON.stringify({
          donorName: this.donationForm.donorName,
          location: this.donationForm.location,
          foodType: this.donationForm.foodType,
          quantity: this.donationForm.quantity
        })
      });

      const result = await response.json();

      if (result.success) {
        this.donationStatusMessage = result.message;
        this.donationForm = { donorName: '', location: '', foodType: '', quantity: null };
        await this.loadMetrics();
      } else {
        this.donationStatusIsError = true;
        this.donationStatusMessage = result.message || 'Unable to submit donation.';
      }
    } catch (error) {
      this.donationStatusIsError = true;
      this.donationStatusMessage = 'Network error while submitting donation.';
    } finally {
      this.isSubmittingDonation = false;
    }
  }

  // ===== Beneficiaries (requires auth) =====
  async submitBeneficiary(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.openAuthModal('login');
      return;
    }

    this.isSubmittingBeneficiary = true;
    this.beneficiaryStatusMessage = '';
    this.beneficiaryStatusIsError = false;

    try {
      const response = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.auth.authHeader() },
        body: JSON.stringify({
          beneficiaryName: this.beneficiaryForm.beneficiaryName,
          needType: this.beneficiaryForm.needType
        })
      });

      const result = await response.json();

      if (result.success) {
        this.beneficiaryStatusMessage = result.message;
        this.beneficiaryForm = { beneficiaryName: '', needType: '' };
        await this.loadMetrics();
      } else {
        this.beneficiaryStatusIsError = true;
        this.beneficiaryStatusMessage = result.message || 'Unable to register beneficiary.';
      }
    } catch (error) {
      this.beneficiaryStatusIsError = true;
      this.beneficiaryStatusMessage = 'Network error while registering beneficiary.';
    } finally {
      this.isSubmittingBeneficiary = false;
    }
  }

  // ===== Auth modal controls =====
  openAuthModal(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
    this.authForm = { name: '', email: '', password: '' };
    this.isAuthModalOpen = true;
  }

  closeAuthModal(): void {
    this.isAuthModalOpen = false;
  }

  switchAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
  }

  async submitAuthForm(): Promise<void> {
    this.isAuthSubmitting = true;
    this.authError = '';

    try {
      const result = this.authMode === 'signup'
        ? await this.auth.register(this.authForm.name, this.authForm.email, this.authForm.password)
        : await this.auth.login(this.authForm.email, this.authForm.password);

      if (result.success) {
        this.isAuthModalOpen = false;
      } else {
        this.authError = result.message;
      }
    } finally {
      this.isAuthSubmitting = false;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
