export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      athlete_private: {
        Row: {
          id: string;
          last_name: string;
        };
        Insert: {
          id: string;
          last_name: string;
        };
        Update: {
          id?: string;
          last_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "athlete_private_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
        ];
      };
      athletes: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"];
          birth_year: number;
          city: string;
          created_at: string;
          first_name: string;
          id: string;
          nickname: string;
          sports: Database["public"]["Enums"]["sport"][];
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"];
          birth_year: number;
          city: string;
          created_at?: string;
          first_name: string;
          id: string;
          nickname: string;
          sports: Database["public"]["Enums"]["sport"][];
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"];
          birth_year?: number;
          city?: string;
          created_at?: string;
          first_name?: string;
          id?: string;
          nickname?: string;
          sports?: Database["public"]["Enums"]["sport"][];
        };
        Relationships: [
          {
            foreignKeyName: "athletes_id_account_type_fkey";
            columns: ["id", "account_type"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id", "account_type"];
          },
        ];
      };
      brands: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"];
          created_at: string;
          id: string;
          name: string;
          sports: Database["public"]["Enums"]["sport"][];
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"];
          created_at?: string;
          id: string;
          name: string;
          sports: Database["public"]["Enums"]["sport"][];
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"];
          created_at?: string;
          id?: string;
          name?: string;
          sports?: Database["public"]["Enums"]["sport"][];
        };
        Relationships: [
          {
            foreignKeyName: "brands_id_account_type_fkey";
            columns: ["id", "account_type"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id", "account_type"];
          },
        ];
      };
      campaigns: {
        Row: {
          brand_id: string;
          created_at: string;
          deadline: string | null;
          description: string;
          id: string;
          sports: Database["public"]["Enums"]["sport"][];
          title: string;
          type: Database["public"]["Enums"]["campaign_type"];
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          deadline?: string | null;
          description: string;
          id?: string;
          sports: Database["public"]["Enums"]["sport"][];
          title: string;
          type: Database["public"]["Enums"]["campaign_type"];
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          deadline?: string | null;
          description?: string;
          id?: string;
          sports?: Database["public"]["Enums"]["sport"][];
          title?: string;
          type?: Database["public"]["Enums"]["campaign_type"];
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"];
          created_at: string;
          id: string;
        };
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"];
          created_at?: string;
          id: string;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"];
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      save_athlete_profile: {
        Args: {
          p_birth_year: number;
          p_city: string;
          p_first_name: string;
          p_last_name: string;
          p_nickname: string;
          p_sports: Database["public"]["Enums"]["sport"][];
        };
        Returns: undefined;
      };
      save_brand_profile: {
        Args: { p_name: string; p_sports: Database["public"]["Enums"]["sport"][] };
        Returns: undefined;
      };
    };
    Enums: {
      account_type: "athlete" | "brand";
      campaign_type: "sponsorship" | "event" | "ambassador";
      sport:
        | "triathlon"
        | "hyrox"
        | "ocr"
        | "fitness"
        | "parkour"
        | "climbing"
        | "mtb"
        | "bmx"
        | "skateboard"
        | "motorsport"
        | "snowboard"
        | "freeski"
        | "surf"
        | "kitesurf"
        | "wakeboard"
        | "kayak";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_type: ["athlete", "brand"],
      campaign_type: ["sponsorship", "event", "ambassador"],
      sport: [
        "triathlon",
        "hyrox",
        "ocr",
        "fitness",
        "parkour",
        "climbing",
        "mtb",
        "bmx",
        "skateboard",
        "motorsport",
        "snowboard",
        "freeski",
        "surf",
        "kitesurf",
        "wakeboard",
        "kayak",
      ],
    },
  },
} as const;
