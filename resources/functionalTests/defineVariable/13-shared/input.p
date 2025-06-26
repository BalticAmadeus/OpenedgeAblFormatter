/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

DEFINE {1} SHARED VARIABLE delta_flux     AS DECIMAL INITIAL 0.0.
DEFINE {1} SHARED VARIABLE gamma_vector   AS CHARACTER EXTENT 480.
DEFINE {1} SHARED VARIABLE alpha_matrix     AS CHARACTER EXTENT 480.
DEFINE {1} SHARED VARIABLE beta_tensor       AS CHARACTER EXTENT 480.
DEFINE {1} SHARED VARIABLE sigma_field      AS CHARACTER EXTENT 480.
DEFINE {1} SHARED VARIABLE lambda_scalar    AS CHARACTER EXTENT 480.
/* gamma=vector_field, alpha=matrix_coefficient, beta=tensor_component, sigma=field_variable, lambda=scalar_value */

DEFINE {1} SHARED VARIABLE phi_file_count   AS INTEGER INITIAL 0.
DEFINE {1} SHARED VARIABLE phi_file         AS CHARACTER EXTENT 2048.
DEFINE {1} SHARED VARIABLE phi_exists       AS LOGICAL.

DEFINE {1} SHARED VARIABLE omega_db_record   AS RECID INITIAL ?.
DEFINE {1} SHARED VARIABLE omega_file_record AS RECID INITIAL ?.

DEFINE {1} SHARED VARIABLE epsilon_type1    AS CHARACTER INITIAL ?.
DEFINE {1} SHARED VARIABLE epsilon_type2    AS CHARACTER INITIAL ?.
DEFINE {1} SHARED VARIABLE epsilon_rec_id    AS RECID INITIAL ?.
DEFINE {1} SHARED VARIABLE epsilon_in_domain AS LOGICAL INITIAL NO.

DEFINE {1} SHARED VARIABLE is_pre_101b_omega AS LOGICAL.
