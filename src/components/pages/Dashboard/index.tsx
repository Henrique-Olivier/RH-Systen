import { useCallback, useEffect, useState } from "react";
import Typography from "../../Typography";
import { BodyContainer, CardContainer, Select } from "./styles";
import { PieChart, Pie, Sector } from 'recharts';
import { carrers, collaborator, payload, propsGraph, selectType } from "./types";
import { theme } from "../../colors/colorts";

let textTooltip: string;

const renderActiveShape = ({payload, ...props}: propsGraph) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} lengthAdjust="spacing">
        {showValue ? `${payload.qtd}: ${payload.name}` : payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${textTooltip} ${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Porcentagem ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

let showValue = false;
export default function Dashboard() {
  const [activeIndex, setActiveIndex] = useState(0);

  const [valueSelect, setValueSelect] = useState<selectType>("region");
  const [titleGraph, setTitleGraph] = useState("funcionarios por estado")

  const [listDataGraph, setListDataGraph] = useState<payload<string | number>[]>([]);

  const onPieEnter = useCallback(
    (_, index: number) => {
      setActiveIndex(index);
    },
    [setActiveIndex]
  );

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if(valueSelect === "region") {
      getCollabs();
      showValue = false
      textTooltip = "Funcionarios";
      setTitleGraph("funcionarios por estado")
    } else {
      getSalaries();
      showValue = true;
      textTooltip = "Salario: R$";
      setTitleGraph("funcionarios por cargo e salario")
    }
  }, [valueSelect]);

  async function getCollabs() {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/Colaborador`, {
        headers: {
          method: 'GET',
          apikey
        }
      })

      if (!res) {
        throw new Error
      }

      const data: collaborator[] = await res.json();
      const dataMapping = mappingCollabs(data);
      setListDataGraph(dataMapping);
      return data;
    } catch (error) {
      console.error("Erro ao buscar Cargos na API: " + error)
      return null;
    }
  };

  async function getSalaries() {
    const collabs = await getCollabs();
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/Cargo`, {
        headers: {
          method: 'GET',
          apikey
        }
      })

      if (!res) {
        throw new Error
      }

      const data: carrers[] = await res.json();
      console.log(data);
      console.log(collabs);
      const salariesMapping = mappingSalaries(data, collabs);
      setListDataGraph(salariesMapping);
      return data;
    } catch (error) {
      console.error("Erro ao buscar Cargos na API: " + error)
      return null;
    }
  }

  function mappingCollabs(data: collaborator[]) {
    const contagem: { [key: string]: number } = {};

    // Contar as ocorrências de cada estado
    data.forEach(item => {
      if (contagem[item.estado]) {
        contagem[item.estado] += 1; // Incrementa se o estado já apareceu
      } else {
        contagem[item.estado] = 1; // Adiciona a primeira ocorrência
      }
    });
    
    // Cria a nova lista com os estados e suas quantidades
    const result = Object.keys(contagem).map(name => ({
      qtd: contagem[name],
      name,
      value: contagem[name]
    }));

    return result;
  }

  function mappingSalaries(listCarrers: carrers[], listCollabs: collaborator[]) {
    const idsLista2 = new Set(listCarrers.map(item => item.id));

    // Contar as ocorrências dos ids de lista1 que estão em lista2
    const countCollabsCarrers = listCollabs.reduce((acc: { id: number, count: number }[], item) => {
      if (idsLista2.has(item.idCargo)) {
        // Verifica se o id já foi adicionado ao resultado
        const existing = acc.find(r => r.id === item.idCargo);
        if (existing) {
          // Se já existe, incrementa a contagem
          existing.count += 1;
        } else {
          // Se não existe, adiciona o novo id com contagem 1
          acc.push({ id: item.idCargo, count: 1 });
        }
      }
      return acc;
    }, []);

    const mapaNomes = new Map<number, string>(
      listCarrers.map(item => [item.id, item.nomeDoCargo])
    );

    const salariesMap = new Map<number, number>(
      listCarrers.map(item => [item.id, item.salario])
    );

    // Iterar sobre listaComContagem e adicionar o nome de lista2
    const resultado = countCollabsCarrers.map(item => {
      const nome = mapaNomes.get(item.id); // Busca o nome usando o id
      const salario = salariesMap.get(item.id);

      return {
        qtd: item.count,
        name: nome!,
        value: salario,
      };
    });
    
    return resultado;

  }

  return(
      <BodyContainer>
          <CardContainer>
              <Typography variant="H4">Olá, bem vindo fulano de tal</Typography>
          </CardContainer>
          <CardContainer>
              <Typography variant="H4">Grafico 1</Typography>
          </CardContainer>
          <CardContainer>
            <div className="graph-container">
              <div>
                <label htmlFor="select-type-pie">
                  <Typography variant="body-XS">Selecione a comparação:</Typography>
                  <Select id="select-type-pie" value={valueSelect} onChange={(e) => setValueSelect(e.target.value)}>
                    <option value="region">Estado</option>
                    <option value="salary">Salario</option>
                  </Select>
                </label>
              </div>
              <PieChart width={700} height={400}>
              <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={listDataGraph}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={120}
                  fill={theme.corporate.purple}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
              />
              </PieChart>
              <Typography variant="H4">Comparativo de {titleGraph}</Typography>
            </div>
          </CardContainer>
      </BodyContainer>
  );
}