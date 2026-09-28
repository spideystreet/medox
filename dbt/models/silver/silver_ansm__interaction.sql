{{ config(materialized='table') }}

-- DISTINCT ON keeps one row per pair. When the parser emits duplicates,
-- the most severe ANSM level is kept.
SELECT DISTINCT ON (TRIM(substance_a), TRIM(substance_b))
    TRIM(substance_a)                   AS substance_a,
    TRIM(substance_b)                   AS substance_b,
    TRIM(niveau_contrainte)             AS niveau_contrainte,
    NULLIF(TRIM(nature_risque), '')     AS nature_risque,
    NULLIF(TRIM(conduite_a_tenir), '')  AS conduite_a_tenir
FROM {{ source('raw', 'ansm_interaction') }}
WHERE substance_a IS NOT NULL
  AND substance_b IS NOT NULL
  AND niveau_contrainte IS NOT NULL
ORDER BY
    TRIM(substance_a),
    TRIM(substance_b),
    CASE TRIM(niveau_contrainte)
        WHEN 'Contre-indication' THEN 1
        WHEN 'Association déconseillée' THEN 2
        WHEN 'Précaution d''emploi' THEN 3
        ELSE 4
    END
